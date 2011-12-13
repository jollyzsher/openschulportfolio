/**
 * The Link Wizard
 *
 * @author Andreas Gohr <gohr@cosmocode.de>
 * @author Pierre Spring <pierre.spring@caillou.ch>
 */
var dw_linkwiz = {
    $wiz: null,
    $entry: null,
    result: null,
    timer: null,
    textArea: null,
    selected: null,
    selection: null,

    /**
     * Initialize the dw_linkwizard by creating the needed HTML
     * and attaching the eventhandlers
     */
    init: function($editor){
        // position relative to the text area
        var pos = $editor.position();

        // create HTML Structure
        dw_linkwiz.$wiz = jQuery(document.createElement('div'))
               .dialog({
                   autoOpen: false,
                   draggable: true,
                   title: LANG.linkwiz,
                   resizable: false
               })
               .html(
                    '<div>'+LANG.linkto+' <input type="text" class="edit" id="link__wiz_entry" autocomplete="off" /></div>'+
                    '<div id="link__wiz_result"></div>'
                    )
               .parent()
               .attr('id','link__wiz')
               .addClass('a11y')
               .css({
                    'position':    'absolute',
                    'top':         (pos.top+20)+'px',
                    'left':        (pos.left+80)+'px'
                   })
               .show()
               .appendTo('div.dokuwiki');

        dw_linkwiz.textArea = $editor[0];
        dw_linkwiz.result = jQuery('#link__wiz_result')[0];

        // scrollview correction on arrow up/down gets easier
        jQuery(dw_linkwiz.result).css('position', 'relative');

        dw_linkwiz.$entry = jQuery('#link__wiz_entry');

        // attach event handlers
        jQuery('#link__wiz_close').click(dw_linkwiz.hide);
        dw_linkwiz.$entry.keyup(dw_linkwiz.onEntry);
        jQuery(dw_linkwiz.result).delegate('a', 'click', dw_linkwiz.onResultClick);
    },

    /**
     * handle all keyup events in the entry field
     */
    onEntry: function(e){
        if(e.keyCode == 37 || e.keyCode == 39){ //left/right
            return true; //ignore
        }
        if(e.keyCode == 27){
            dw_linkwiz.hide();
            e.preventDefault();
            e.stopPropagation();
            return false;
        }
        if(e.keyCode == 38){ //Up
            dw_linkwiz.select(dw_linkwiz.selected -1);
            e.preventDefault();
            e.stopPropagation();
            return false;
        }
        if(e.keyCode == 40){ //Down
            dw_linkwiz.select(dw_linkwiz.selected +1);
            e.preventDefault();
            e.stopPropagation();
            return false;
        }
        if(e.keyCode == 13){ //Enter
            if(dw_linkwiz.selected > -1){
                var $obj = dw_linkwiz.$getResult(dw_linkwiz.selected);
                if($obj.length > 0){
                    dw_linkwiz.resultClick($obj.find('a')[0]);
                }
            }else if(dw_linkwiz.$entry.val()){
                dw_linkwiz.insertLink(dw_linkwiz.$entry.val());
            }

            e.preventDefault();
            e.stopPropagation();
            return false;
        }
        dw_linkwiz.autocomplete();
    },

    /**
     * Get one of the results by index
     *
     * @param int result div to return
     * @returns DOMObject or null
     */
    getResult: function(num){
        DEPRECATED('use dw_linkwiz.$getResult()[0] instead');
        return dw_linkwiz.$getResult()[0] || null;
    },

    /**
     * Get one of the results by index
     *
     * @param int result div to return
     * @returns jQuery object
     */
    $getResult: function(num) {
        return jQuery(dw_linkwiz.result).find('div').eq(num);
    },

    /**
     * Select the given result
     */
    select: function(num){
        if(num < 0){
            dw_linkwiz.deselect();
            return;
        }

        var $obj = dw_linkwiz.$getResult(num);
        if ($obj.length === 0) {
            return;
        }

        dw_linkwiz.deselect();
        $obj.addClass('selected');

        // make sure the item is viewable in the scroll view

        //getting child position within the parent
        var childPos = $obj.position().top;
        //getting difference between the childs top and parents viewable area
        var yDiff = childPos + $obj.outerHeight() - jQuery(dw_linkwiz.result).innerHeight();

        if (childPos < 0) {
            //if childPos is above viewable area (that's why it goes negative)
            jQuery(dw_linkwiz.result)[0].scrollTop += childPos;
        } else if(yDiff > 0) {
            // if difference between childs top and parents viewable area is
            // greater than the height of a childDiv
            jQuery(dw_linkwiz.result)[0].scrollTop += yDiff;
        }

        dw_linkwiz.selected = num;
    },

    /**
     * deselect a result if any is selected
     */
    deselect: function(){
        if(dw_linkwiz.selected > -1){
            dw_linkwiz.$getResult(dw_linkwiz.selected).removeClass('selected');
        }
        dw_linkwiz.selected = -1;
    },

    /**
     * Handle clicks in the result set an dispatch them to
     * resultClick()
     */
    onResultClick: function(e){
        if(!jQuery(this).is('a')) {
            return;
        }
        e.stopPropagation();
        e.preventDefault();
        dw_linkwiz.resultClick(this);
        return false;
    },

    /**
     * Handles the "click" on a given result anchor
     */
    resultClick: function(a){
        dw_linkwiz.$entry.val(a.title);
        if(a.title == '' || a.title.substr(-1) == ':'){
            dw_linkwiz.autocomplete_exec();
        }else{
            if (jQuery(a.nextSibling).is('span')) {
                dw_linkwiz.insertLink(a.nextSibling.innerHTML);
            }else{
                dw_linkwiz.insertLink('');
            }
        }
    },

    /**
     * Insert the id currently in the entry box to the textarea,
     * replacing the current selection or at the cursor position.
     * When no selection is available the given title will be used
     * as link title instead
     */
    insertLink: function(title){
        var link = dw_linkwiz.$entry.val(),
            sel, stxt;
        if(!link) {
            return;
        }

        sel = getSelection(dw_linkwiz.textArea);
        if(sel.start == 0 && sel.end == 0) {
            sel = dw_linkwiz.selection;
        }

        stxt = sel.getText();

        // don't include trailing space in selection
        if(stxt.charAt(stxt.length - 1) == ' '){
            sel.end--;
            stxt = sel.getText();
        }

        if(!stxt && !DOKU_UHC) {
            stxt=title;
        }

        // prepend colon inside namespaces for non namespace pages
        if(dw_linkwiz.textArea.form.id.value.indexOf(':') != -1 &&
           link.indexOf(':') == -1){
           link = ':' + link;
        }

        var so = link.length+3;

        link = '[['+link+'|';
        if(stxt) {
            link += stxt;
        }
        link += ']]';

        pasteText(sel,link,{startofs: so, endofs: 2});
        dw_linkwiz.hide();

        // reset the entry to the parent namespace
        dw_linkwiz.$entry.val(dw_linkwiz.$entry.val().replace(/[^:]*$/, ''));
    },

    /**
     * Start the page/namespace lookup timer
     *
     * Calls autocomplete_exec when the timer runs out
     */
    autocomplete: function(){
        if(dw_linkwiz.timer !== null){
            window.clearTimeout(dw_linkwiz.timer);
            dw_linkwiz.timer = null;
        }

        dw_linkwiz.timer = window.setTimeout(dw_linkwiz.autocomplete_exec,350);
    },

    /**
     * Executes the AJAX call for the page/namespace lookup
     */
    autocomplete_exec: function(){
        var $res = jQuery(dw_linkwiz.result);
        dw_linkwiz.deselect();
        $res.html('<img src="'+DOKU_BASE+'lib/images/throbber.gif" alt="" width="16" height="16" />')
            .load(
            DOKU_BASE + 'lib/exe/ajax.php',
            {
                call: 'linkwiz',
                q: dw_linkwiz.$entry.val()
            }
        );
    },

    /**
     * Show the link wizard
     */
    show: function(){
        dw_linkwiz.selection  = getSelection(dw_linkwiz.textArea);
        dw_linkwiz.$wiz.removeClass('a11y');
        dw_linkwiz.$entry.focus();
        dw_linkwiz.autocomplete();
    },

    /**
     * Hide the link wizard
     */
    hide: function(){
        dw_linkwiz.$wiz.addClass('a11y');
        dw_linkwiz.textArea.focus();
    },

    /**
     * Toggle the link wizard
     */
    toggle: function(){
        if(dw_linkwiz.$wiz.hasClass('a11y')){
            dw_linkwiz.show();
        }else{
            dw_linkwiz.hide();
        }
    }
};
