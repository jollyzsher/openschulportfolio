/**
 * Page behaviours
 *
 * This class adds various behaviours to the rendered page
 */
dw_page = {
    /**
     * initialize page behaviours
     */
    init: function(){
        dw_page.sectionHighlight();
        jQuery('a.fn_top').mouseover(dw_page.footnoteDisplay);
        dw_page.makeToggle('#dw__toc h3','#dw__toc > div');
    },

    /**
     * Highlight the section when hovering over the appropriate section edit button
     *
     * @author Andreas Gohr <andi@splitbrain.org>
     */
    sectionHighlight: function() {
        jQuery('form.btn_secedit')
            .mouseover(function(){
                var $tgt = jQuery(this).parent(),
                    nr = $tgt.attr('class').match(/(\s+|^)editbutton_(\d+)(\s+|$)/)[2];

                // Walk the DOM tree up (first previous siblings, then parents)
                // until boundary element
                while($tgt.length > 0 && !$tgt.hasClass('sectionedit' + nr)) {
                    // go down when the sectionedit begin marker is below $tgt
                    if ($tgt.find('.sectionedit' + nr).length > 0) {
                        $tgt = $tgt.children().last();
                    } else {
                        // $.last gives the DOM-ordered last element:
                        // prev if present, else parent.
                        $tgt = $tgt.prev().add($tgt.parent()).last();
                    }
                    $tgt.addClass('section_highlight');
                }
            })
            .mouseout(function(){
                jQuery('.section_highlight').removeClass('section_highlight');
            });
    },

    /**
     * Create/get a insitu popup used by the footnotes
     *
     * @param target - the DOM element at which the popup should be aligned at
     * @param popup_id - the ID of the (new) DOM popup
     * @return the Popup jQuery object
     */
    insituPopup: function(target, popup_id) {
        // get or create the popup div
        var $fndiv = jQuery('#' + popup_id);

        // popup doesn't exist, yet -> create it
        if($fndiv.length === 0){
            $fndiv = jQuery(document.createElement('div'))
                .attr('id', popup_id)
                .addClass('insitu-footnote JSpopup')
                .mouseleave(function () {jQuery(this).hide();});
            jQuery('.dokuwiki:first').append($fndiv);
        }

        // position() does not support hidden elements
        $fndiv.show().position({
            my: 'left top',
            at: 'left center',
            of: target
        }).hide();

        return $fndiv;
    },

    /**
     * Display an insitu footnote popup
     *
     * @author Andreas Gohr <andi@splitbrain.org>
     * @author Chris Smith <chris@jalakai.co.uk>
     */
    footnoteDisplay: function () {
        var content = jQuery(jQuery(this).attr('href')) // Footnote text anchor
                      .closest('div.fn').html();

        if (content === null){
            return;
        }

        // strip the leading content anchors and their comma separators
        content = content.replace(/((^|\s*,\s*)<sup>.*?<\/sup>)+\s*/gi, '');

        // prefix ids on any elements with "insitu__" to ensure they remain unique
        content = content.replace(/\bid=(['"])([^"']+)\1/gi,'id="insitu__$2');

        // now put the content into the wrapper
        dw_page.insituPopup(this, 'insitu__fn').html(content).show();
    },

    /**
     * Makes an element foldable by clicking its handle
     *
     * This is used for the TOC toggling, but can be used for other elements
     * as well. A state indicator is inserted into the handle and can be styled
     * by CSS.
     *
     * @param selector handle What should be clicked to toggle
     * @param selector content This element will be toggled
     */
    makeToggle: function(handle, content, state){
        var $handle, $content, $clicky, $child, setClicky;
        $handle = jQuery(handle);
        if(!$handle.length) return;
        $content = jQuery(content);
        if(!$content.length) return;

        // we animate the children
        $child = $content.children();

        // class/display toggling
        setClicky = function(hiding){
            if(hiding){
                $clicky.html('<span>+</span>');
                $handle.addClass('closed');
                $handle.removeClass('open');
            }else{
                $clicky.html('<span>−</span>');
                $handle.addClass('open');
                $handle.removeClass('closed');
            }
        };

        $handle[0].setState = function(state){
            var hidden;
            if(!state) state = 1;

            // Assert that content instantly takes the whole space
            $content.css('min-height', $content.height()).show();

            // stop any running animation
            $child.stop(true, true);

            // was a state given or do we toggle?
            if(state === -1) {
                hidden = false;
            } else if(state === 1) {
                hidden = true;
            } else {
                hidden = $child.is(':hidden');
            }

            // update the state
            setClicky(!hidden);

            // Start animation and assure that $toc is hidden/visible
            $child.dw_toggle(hidden, function () {
                $content.toggle(hidden);
                $content.css('min-height',''); // remove min-height again
            });
        };

        // the state indicator
        $clicky = jQuery(document.createElement('strong'));

        // click function
        $handle.css('cursor','pointer')
               .click($handle[0].setState)
               .prepend($clicky);

        // initial state
        $handle[0].setState(state);
    }
};

jQuery(dw_page.init);
