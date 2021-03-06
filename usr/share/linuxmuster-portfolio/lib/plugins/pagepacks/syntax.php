<?php
/**
 * Pagepacks Plugin: Initial installation of page structure for openschulportfolio
 *
 * @license    GPL 2 (http://www.gnu.org/licenses/gpl.html)
 * @author     Frank Schiebel <frank@linuxmuster.net>
 */

if(!defined('DOKU_INC')) define('DOKU_INC',realpath(dirname(__FILE__).'/../../').'/');
if(!defined('DOKU_PLUGIN')) define('DOKU_PLUGIN',DOKU_INC.'lib/plugins/');

require_once(DOKU_PLUGIN.'syntax.php');
require_once(DOKU_INC.'inc/confutils.php');
require_once(DOKU_INC.'inc/pageutils.php');

define('DOKU_plugin_pagepacks_NOMATCH', -1);
define('DOKU_plugin_pagepacks_OUTSIDEJAIL', -2);

/**
 * All DokuWiki plugins to d the parser/rendering mechanism * need to inherit from this class
 */
class syntax_plugin_pagepacks extends DokuWiki_Syntax_Plugin {

    var $mediadir;

    function syntax_plugin_pagepacks() {
        global $conf;
        $basedir = $conf['savedir'];
        if (!$this->_path_is_absolute($basedir)) {
            $basedir = DOKU_INC . '/' . $basedir;
        }
        $packdir = $basedir . "/media/" . str_replace(':', '/', trim($this->getConf('pagepacks_src')));

        $this->packdir = $this->_win_path_convert($this->_realpath($packdir).'/');
    }

    /**
     * return some info
     */
    function getInfo() {
        return array(
            'author' => 'Frank Schiebel',
            'email'  => 'frank@linuxmuster.net',
            'date'   => '2012-03-11',
            'name'   => 'Pagepacks Plugin',
            'desc'   => 'Plugin to unpack pagepacks',
            'url'    => 'http://www.openschulportfolio.de',
        );
    }

    function getType(){ return 'substition'; }
    function getPType(){ return 'block'; }
    function getSort(){ return 222; }

    function connectTo($mode) {
        $this->Lexer->addSpecialPattern('\{\{pagepackform>.+?\}\}',$mode,'plugin_pagepacks');

    }

    /**
     * Handle the match
     */
   function handle($match, $state, $pos, &$handler) {

        $match = substr($match, 2, -2);
        list($type, $ext) = split('>', $match, 2);

        return array($type,$ext);
    }

    /**
     * Create output
     */
    function render($mode, &$renderer, $data) {
        global $conf;

        // disable caching
        $renderer->info['cache'] = false;

        list($type,$ext) = $data;
        if ($mode == 'xhtml') {
            $renderer->doc .=$this->_showform();

            return true;
        }
        return false;
    }

    /**
     * Determines whether a given path is absolute or relative.
     * On windows plattforms, it does so by checking whether the second character
     * of the path is a :, on all other plattforms it checks for a / as the
     * first character.
     *
     * @param $path the path to check
     * @return true if path is absolute, false otherwise
     */
    function _path_is_absolute($path) {
        if (strtoupper(substr(PHP_OS, 0, 3)) === 'WIN') {
            return ($path[1] == ':');
        } else {
            return ($path[0] == '/');
        }
    }

    /**
     * Converts backslashs in paths to slashs.
     *
     * @param $path the path to convert
     * @return the converted path
     */
    function _win_path_convert($path) {
        return str_replace('\\', '/', trim($path));
    }

    /**
     * Canonicalizes a given path. A bit like realpath,
     * but without the resolving of symlinks.
     *
     * @author anonymous
     * @see <http://www.php.net/manual/en/function.realpath.php#73563>
     */
    function _realpath($path) {
        $path=explode('/', $path);
        $output=array();
        for ($i=0; $i<sizeof($path); $i++) {
            if (('' == $path[$i] && $i > 0) || '.' == $path[$i]) continue;
            if ('..' == $path[$i] && $i > 0 && '..' != $output[sizeof($output) - 1]){
                array_pop($output);
                continue;
            }
            array_push($output, $path[$i]);
        }
        return implode('/', $output);
    }

    /**
     * FIXME use DokuWikis inc/form.php for this?
     */
    function _showform() {
        global $ID, $lang, $INFO, $conf;
        if (auth_quickaclcheck($ID) < AUTH_ADMIN) {
            $ret = $this->getLang('admin_required');
            return $ret;
        }

        $packfiles = scandir("$this->packdir");
        foreach ($packfiles as $file) {
            if (preg_match ("/.zip$/i", $file)) {
                $fileinfo = $this->packdir . $file . ".info";
                if(file_exists($fileinfo)) {
                    $info = io_readfile($fileinfo);
                } else {
                    $info = "";
                }
                $formselects .= '<p class="radioleft"><input type="radio" name="packzipfile" value=' . $file . '> ' . $file . '<span>' . $info . '</span>' . '</p>';
            }
        }

        $ret  = '<div>'.DOKU_LF;
        $ret .= '<form id="pagepack"  method="post" action="'.script().'" accept-charset="'.$lang['encoding'].'">'.DOKU_LF;
        $ret .= DOKU_TAB.'<fieldset>'.DOKU_LF;
        $ret .= DOKU_TAB.DOKU_TAB.'<legend> '.$this->getLang('pagepacks').': </legend>'.DOKU_LF;
        $ret .= DOKU_TAB.DOKU_TAB.'<input type="hidden" name="do" value="unzip" />'.DOKU_LF;
        $ret .= $formselects;
        $ret .= DOKU_TAB.DOKU_TAB.'<input class="button" type="submit" value="'.$this->getLang('btn_unzip').'" tabindex="5" />'.DOKU_LF;
        $ret .= DOKU_TAB.'</fieldset>'.DOKU_LF;
        $ret .= '</form>'.DOKU_LF;
        $ret .= '</div>'.DOKU_LF;
        return $ret;
    }




}
