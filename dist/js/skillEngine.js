/*!
 * jQuery Mousewheel 3.1.12
 *
 * Copyright 2014 jQuery Foundation and other contributors
 * Released under the MIT license.
 * http://jquery.org/license
 */

(function (factory) {
    if (typeof define === 'function' && define.amd) {
        // AMD. Register as an anonymous module.
        define(['jquery'], factory);
    } else if (typeof exports === 'object') {
        // Node/CommonJS style for Browserify
        module.exports = factory;
    } else {
        // Browser globals
        factory(jQuery);
    }
}(function ($) {

    var toFix = ['wheel', 'mousewheel', 'DOMMouseScroll', 'MozMousePixelScroll'],
            toBind = ('onwheel' in document || document.documentMode >= 9) ?
            ['wheel'] : ['mousewheel', 'DomMouseScroll', 'MozMousePixelScroll'],
            slice = Array.prototype.slice,
            nullLowestDeltaTimeout, lowestDelta;

    if ($.event.fixHooks) {
        for (var i = toFix.length; i; ) {
            $.event.fixHooks[ toFix[--i] ] = $.event.mouseHooks;
        }
    }

    var special = $.event.special.mousewheel = {
        version: '3.1.12',
        setup: function () {
            if (this.addEventListener) {
                for (var i = toBind.length; i; ) {
                    this.addEventListener(toBind[--i], handler, false);
                }
            } else {
                this.onmousewheel = handler;
            }
            // Store the line height and page height for this particular element
            $.data(this, 'mousewheel-line-height', special.getLineHeight(this));
            $.data(this, 'mousewheel-page-height', special.getPageHeight(this));
        },
        teardown: function () {
            if (this.removeEventListener) {
                for (var i = toBind.length; i; ) {
                    this.removeEventListener(toBind[--i], handler, false);
                }
            } else {
                this.onmousewheel = null;
            }
            // Clean up the data we added to the element
            $.removeData(this, 'mousewheel-line-height');
            $.removeData(this, 'mousewheel-page-height');
        },
        getLineHeight: function (elem) {
            var $elem = $(elem),
                    $parent = $elem['offsetParent' in $.fn ? 'offsetParent' : 'parent']();
            if (!$parent.length) {
                $parent = $('body');
            }
            return parseInt($parent.css('fontSize'), 10) || parseInt($elem.css('fontSize'), 10) || 16;
        },
        getPageHeight: function (elem) {
            return $(elem).height();
        },
        settings: {
            adjustOldDeltas: true, // see shouldAdjustOldDeltas() below
            normalizeOffset: true  // calls getBoundingClientRect for each event
        }
    };

    $.fn.extend({
        mousewheel: function (fn) {
            return fn ? this.bind('mousewheel', fn) : this.trigger('mousewheel');
        },
        unmousewheel: function (fn) {
            return this.unbind('mousewheel', fn);
        }
    });


    function handler(event) {
        var orgEvent = event || window.event,
                args = slice.call(arguments, 1),
                delta = 0,
                deltaX = 0,
                deltaY = 0,
                absDelta = 0,
                offsetX = 0,
                offsetY = 0;
        event = $.event.fix(orgEvent);
        event.type = 'mousewheel';

        // Old school scrollwheel delta
        if ('detail'      in orgEvent) {
            deltaY = orgEvent.detail * -1;
        }
        if ('wheelDelta'  in orgEvent) {
            deltaY = orgEvent.wheelDelta;
        }
        if ('wheelDeltaY' in orgEvent) {
            deltaY = orgEvent.wheelDeltaY;
        }
        if ('wheelDeltaX' in orgEvent) {
            deltaX = orgEvent.wheelDeltaX * -1;
        }

        // Firefox < 17 horizontal scrolling related to DOMMouseScroll event
        if ('axis' in orgEvent && orgEvent.axis === orgEvent.HORIZONTAL_AXIS) {
            deltaX = deltaY * -1;
            deltaY = 0;
        }

        // Set delta to be deltaY or deltaX if deltaY is 0 for backwards compatabilitiy
        delta = deltaY === 0 ? deltaX : deltaY;

        // New school wheel delta (wheel event)
        if ('deltaY' in orgEvent) {
            deltaY = orgEvent.deltaY * -1;
            delta = deltaY;
        }
        if ('deltaX' in orgEvent) {
            deltaX = orgEvent.deltaX;
            if (deltaY === 0) {
                delta = deltaX * -1;
            }
        }

        // No change actually happened, no reason to go any further
        if (deltaY === 0 && deltaX === 0) {
            return;
        }

        // Need to convert lines and pages to pixels if we aren't already in pixels
        // There are three delta modes:
        //   * deltaMode 0 is by pixels, nothing to do
        //   * deltaMode 1 is by lines
        //   * deltaMode 2 is by pages
        if (orgEvent.deltaMode === 1) {
            var lineHeight = $.data(this, 'mousewheel-line-height');
            delta *= lineHeight;
            deltaY *= lineHeight;
            deltaX *= lineHeight;
        } else if (orgEvent.deltaMode === 2) {
            var pageHeight = $.data(this, 'mousewheel-page-height');
            delta *= pageHeight;
            deltaY *= pageHeight;
            deltaX *= pageHeight;
        }

        // Store lowest absolute delta to normalize the delta values
        absDelta = Math.max(Math.abs(deltaY), Math.abs(deltaX));

        if (!lowestDelta || absDelta < lowestDelta) {
            lowestDelta = absDelta;

            // Adjust older deltas if necessary
            if (shouldAdjustOldDeltas(orgEvent, absDelta)) {
                lowestDelta /= 40;
            }
        }

        // Adjust older deltas if necessary
        if (shouldAdjustOldDeltas(orgEvent, absDelta)) {
            // Divide all the things by 40!
            delta /= 40;
            deltaX /= 40;
            deltaY /= 40;
        }

        // Get a whole, normalized value for the deltas
        delta = Math[ delta >= 1 ? 'floor' : 'ceil' ](delta / lowestDelta);
        deltaX = Math[ deltaX >= 1 ? 'floor' : 'ceil' ](deltaX / lowestDelta);
        deltaY = Math[ deltaY >= 1 ? 'floor' : 'ceil' ](deltaY / lowestDelta);

        // Normalise offsetX and offsetY properties
        if (special.settings.normalizeOffset && this.getBoundingClientRect) {
            var boundingRect = this.getBoundingClientRect();
            offsetX = event.clientX - boundingRect.left;
            offsetY = event.clientY - boundingRect.top;
        }

        // Add information to the event object
        event.deltaX = deltaX;
        event.deltaY = deltaY;
        event.deltaFactor = lowestDelta;
        event.offsetX = offsetX;
        event.offsetY = offsetY;
        // Go ahead and set deltaMode to 0 since we converted to pixels
        // Although this is a little odd since we overwrite the deltaX/Y
        // properties with normalized deltas.
        event.deltaMode = 0;

        // Add event and delta to the front of the arguments
        args.unshift(event, delta, deltaX, deltaY);

        // Clearout lowestDelta after sometime to better
        // handle multiple device types that give different
        // a different lowestDelta
        // Ex: trackpad = 3 and mouse wheel = 120
        if (nullLowestDeltaTimeout) {
            clearTimeout(nullLowestDeltaTimeout);
        }
        nullLowestDeltaTimeout = setTimeout(nullLowestDelta, 200);

        return ($.event.dispatch || $.event.handle).apply(this, args);
    }

    function nullLowestDelta() {
        lowestDelta = null;
    }

    function shouldAdjustOldDeltas(orgEvent, absDelta) {
        // If this is an older event and the delta is divisable by 120,
        // then we are assuming that the browser is treating this as an
        // older mouse wheel event and that we should divide the deltas
        // by 40 to try and get a more usable deltaFactor.
        // Side note, this actually impacts the reported scroll distance
        // in older browsers and can cause scrolling to be slower than native.
        // Turn this off by setting $.event.special.mousewheel.settings.adjustOldDeltas to false.
        return special.settings.adjustOldDeltas && orgEvent.type === 'mousewheel' && absDelta % 120 === 0;
    }

}));

/*
 == malihu jquery custom scrollbar plugin ==
 Version: 3.0.9
 Plugin URI: http://manos.malihu.gr/jquery-custom-content-scroller
 Author: malihu
 Author URI: http://manos.malihu.gr
 License: MIT License (MIT)
 */

/*
 Copyright 2010 Manos Malihutsakis (email: manos@malihu.gr)

 Permission is hereby granted, free of charge, to any person obtaining a copy
 of this software and associated documentation files (the "Software"), to deal
 in the Software without restriction, including without limitation the rights
 to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 copies of the Software, and to permit persons to whom the Software is
 furnished to do so, subject to the following conditions:

 The above copyright notice and this permission notice shall be included in
 all copies or substantial portions of the Software.

 THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 THE SOFTWARE.
 */

/*
 The code below is fairly long, fully commented and should be normally used in development.
 For production, use either the minified jquery.mCustomScrollbar.min.js script or
 the production-ready jquery.mCustomScrollbar.concat.min.js which contains the plugin
 and dependencies (minified).
 */

(function (factory) {
    if (typeof module !== "undefined" && module.exports) {
        module.exports = factory;
    } else {
        factory(jQuery, window, document);
    }
}(function ($) {
    (function (init) {
        var _rjs = typeof define === "function" && define.amd, /* RequireJS */
                _njs = typeof module !== "undefined" && module.exports, /* NodeJS */
                _dlp = ("https:" == document.location.protocol) ? "https:" : "http:", /* location protocol */
                _url = "cdnjs.cloudflare.com/ajax/libs/jquery-mousewheel/3.1.12/jquery.mousewheel.min.js";
        if (!_rjs) {
            if (_njs) {
                require("jquery-mousewheel")($);
            } else {
                /* load jquery-mousewheel plugin (via CDN) if it's not present or not loaded via RequireJS
                 (works when mCustomScrollbar fn is called on window load) */
                $.event.special.mousewheel || $("head").append(decodeURI("%3Cscript src=" + _dlp + "//" + _url + "%3E%3C/script%3E"));
            }
        }
        init();
    }(function () {

        /*
         ----------------------------------------
         PLUGIN NAMESPACE, PREFIX, DEFAULT SELECTOR(S)
         ----------------------------------------
         */

        var pluginNS = "mCustomScrollbar",
                pluginPfx = "mCS",
                defaultSelector = ".mCustomScrollbar",
                /*
                 ----------------------------------------
                 DEFAULT OPTIONS
                 ----------------------------------------
                 */

                defaults = {
                    /*
                     set element/content width/height programmatically
                     values: boolean, pixels, percentage
                     option						default
                     -------------------------------------
                     setWidth					false
                     setHeight					false
                     */
                    /*
                     set the initial css top property of content
                     values: string (e.g. "-100px", "10%" etc.)
                     */
                    setTop: 0,
                    /*
                     set the initial css left property of content
                     values: string (e.g. "-100px", "10%" etc.)
                     */
                    setLeft: 0,
                    /*
                     scrollbar axis (vertical and/or horizontal scrollbars)
                     values (string): "y", "x", "yx"
                     */
                    axis: "y",
                    /*
                     position of scrollbar relative to content
                     values (string): "inside", "outside" ("outside" requires elements with position:relative)
                     */
                    scrollbarPosition: "inside",
                    /*
                     scrolling inertia
                     values: integer (milliseconds)
                     */
                    scrollInertia: 950,
                    /*
                     auto-adjust scrollbar dragger length
                     values: boolean
                     */
                    autoDraggerLength: true,
                    /*
                     auto-hide scrollbar when idle
                     values: boolean
                     option						default
                     -------------------------------------
                     autoHideScrollbar			false
                     */
                    /*
                     auto-expands scrollbar on mouse-over and dragging
                     values: boolean
                     option						default
                     -------------------------------------
                     autoExpandScrollbar			false
                     */
                    /*
                     always show scrollbar, even when there's nothing to scroll
                     values: integer (0=disable, 1=always show dragger rail and buttons, 2=always show dragger rail, dragger and buttons), boolean
                     */
                    alwaysShowScrollbar: 0,
                    /*
                     scrolling always snaps to a multiple of this number in pixels
                     values: integer
                     option						default
                     -------------------------------------
                     snapAmount					null
                     */
                    /*
                     when snapping, snap with this number in pixels as an offset
                     values: integer
                     */
                    snapOffset: 0,
                    /*
                     mouse-wheel scrolling
                     */
                    mouseWheel: {
                        /*
                         enable mouse-wheel scrolling
                         values: boolean
                         */
                        enable: true,
                        /*
                         scrolling amount in pixels
                         values: "auto", integer
                         */
                        scrollAmount: "auto",
                        /*
                         mouse-wheel scrolling axis
                         the default scrolling direction when both vertical and horizontal scrollbars are present
                         values (string): "y", "x"
                         */
                        axis: "y",
                        /*
                         prevent the default behaviour which automatically scrolls the parent element(s) when end of scrolling is reached
                         values: boolean
                         option						default
                         -------------------------------------
                         preventDefault				null
                         */
                        /*
                         the reported mouse-wheel delta value. The number of lines (translated to pixels) one wheel notch scrolls.
                         values: "auto", integer
                         "auto" uses the default OS/browser value
                         */
                        deltaFactor: "auto",
                        /*
                         normalize mouse-wheel delta to -1 or 1 (disables mouse-wheel acceleration)
                         values: boolean
                         option						default
                         -------------------------------------
                         normalizeDelta				null
                         */
                        /*
                         invert mouse-wheel scrolling direction
                         values: boolean
                         option						default
                         -------------------------------------
                         invert						null
                         */
                        /*
                         the tags that disable mouse-wheel when cursor is over them
                         */
                        disableOver: ["select", "option", "keygen", "datalist", "textarea"]
                    },
                    /*
                     scrollbar buttons
                     */
                    scrollButtons: {
                        /*
                         enable scrollbar buttons
                         values: boolean
                         option						default
                         -------------------------------------
                         enable						null
                         */
                        /*
                         scrollbar buttons scrolling type
                         values (string): "stepless", "stepped"
                         */
                        scrollType: "stepless",
                        /*
                         scrolling amount in pixels
                         values: "auto", integer
                         */
                        scrollAmount: "auto"
                                /*
                                 tabindex of the scrollbar buttons
                                 values: false, integer
                                 option						default
                                 -------------------------------------
                                 tabindex					null
                                 */
                    },
                    /*
                     keyboard scrolling
                     */
                    keyboard: {
                        /*
                         enable scrolling via keyboard
                         values: boolean
                         */
                        enable: true,
                        /*
                         keyboard scrolling type
                         values (string): "stepless", "stepped"
                         */
                        scrollType: "stepless",
                        /*
                         scrolling amount in pixels
                         values: "auto", integer
                         */
                        scrollAmount: "auto"
                    },
                    /*
                     enable content touch-swipe scrolling
                     values: boolean, integer, string (number)
                     integer values define the axis-specific minimum amount required for scrolling momentum
                     */
                    contentTouchScroll: 25,
                    /*
                     advanced option parameters
                     */
                    advanced: {
                        /*
                         auto-expand content horizontally (for "x" or "yx" axis)
                         values: boolean
                         option						default
                         -------------------------------------
                         autoExpandHorizontalScroll	null
                         */
                        /*
                         auto-scroll to elements with focus
                         */
                        autoScrollOnFocus: "input,textarea,select,button,datalist,keygen,a[tabindex],area,object,[contenteditable='true']",
                        /*
                         auto-update scrollbars on content, element or viewport resize
                         should be true for fluid layouts/elements, adding/removing content dynamically, hiding/showing elements, content with images etc.
                         values: boolean
                         */
                        updateOnContentResize: true,
                        /*
                         auto-update scrollbars each time each image inside the element is fully loaded
                         values: boolean
                         */
                        updateOnImageLoad: true,
                        /*
                         auto-update scrollbars based on the amount and size changes of specific selectors
                         useful when you need to update the scrollbar(s) automatically, each time a type of element is added, removed or changes its size
                         values: boolean, string (e.g. "ul li" will auto-update scrollbars each time list-items inside the element are changed)
                         a value of true (boolean) will auto-update scrollbars each time any element is changed
                         option						default
                         -------------------------------------
                         updateOnSelectorChange		null
                         */
                        /*
                         extra selectors that'll release scrollbar dragging upon mouseup, pointerup, touchend etc. (e.g. "selector-1, selector-2")
                         option						default
                         -------------------------------------
                         releaseDraggableSelectors	null
                         */
                        /*
                         auto-update timeout
                         values: integer (milliseconds)
                         */
                        autoUpdateTimeout: 60
                    },
                    /*
                     scrollbar theme
                     values: string (see CSS/plugin URI for a list of ready-to-use themes)
                     */
                    theme: "light",
                    /*
                     user defined callback functions
                     */
                    callbacks: {
                        /*
                         Available callbacks:
                         callback					default
                         -------------------------------------
                         onInit						null
                         onScrollStart				null
                         onScroll					null
                         onTotalScroll				null
                         onTotalScrollBack			null
                         whileScrolling				null
                         onOverflowY					null
                         onOverflowX					null
                         onOverflowYNone				null
                         onOverflowXNone				null
                         onImageLoad					null
                         onSelectorChange			null
                         onUpdate					null
                         */
                        onTotalScrollOffset: 0,
                        onTotalScrollBackOffset: 0,
                        alwaysTriggerOffsets: true
                    }
                    /*
                     add scrollbar(s) on all elements matching the current selector, now and in the future
                     values: boolean, string
                     string values: "on" (enable), "once" (disable after first invocation), "off" (disable)
                     liveSelector values: string (selector)
                     option						default
                     -------------------------------------
                     live						false
                     liveSelector				null
                     */
                },
        /*
         ----------------------------------------
         VARS, CONSTANTS
         ----------------------------------------
         */

        totalInstances = 0, /* plugin instances amount */
                liveTimers = {}, /* live option timers */
                oldIE = (window.attachEvent && !window.addEventListener) ? 1 : 0, /* detect IE < 9 */
                touchActive = false, touchable, /* global touch vars (for touch and pointer events) */
                /* general plugin classes */
                classes = [
                    "mCSB_dragger_onDrag", "mCSB_scrollTools_onDrag", "mCS_img_loaded", "mCS_disabled", "mCS_destroyed", "mCS_no_scrollbar",
                    "mCS-autoHide", "mCS-dir-rtl", "mCS_no_scrollbar_y", "mCS_no_scrollbar_x", "mCS_y_hidden", "mCS_x_hidden", "mCSB_draggerContainer",
                    "mCSB_buttonUp", "mCSB_buttonDown", "mCSB_buttonLeft", "mCSB_buttonRight"
                ],
                /*
                 ----------------------------------------
                 METHODS
                 ----------------------------------------
                 */

                methods = {
                    /*
                     plugin initialization method
                     creates the scrollbar(s), plugin data object and options
                     ----------------------------------------
                     */

                    init: function (options) {

                        var options = $.extend(true, {}, defaults, options),
                                selector = _selector.call(this); /* validate selector */

                        /*
                         if live option is enabled, monitor for elements matching the current selector and
                         apply scrollbar(s) when found (now and in the future)
                         */
                        if (options.live) {
                            var liveSelector = options.liveSelector || this.selector || defaultSelector, /* live selector(s) */
                                    $liveSelector = $(liveSelector); /* live selector(s) as jquery object */
                            if (options.live === "off") {
                                /*
                                 disable live if requested
                                 usage: $(selector).mCustomScrollbar({live:"off"});
                                 */
                                removeLiveTimers(liveSelector);
                                return;
                            }
                            liveTimers[liveSelector] = setTimeout(function () {
                                /* call mCustomScrollbar fn on live selector(s) every half-second */
                                $liveSelector.mCustomScrollbar(options);
                                if (options.live === "once" && $liveSelector.length) {
                                    /* disable live after first invocation */
                                    removeLiveTimers(liveSelector);
                                }
                            }, 500);
                        } else {
                            removeLiveTimers(liveSelector);
                        }

                        /* options backward compatibility (for versions < 3.0.0) and normalization */
                        options.setWidth = (options.set_width) ? options.set_width : options.setWidth;
                        options.setHeight = (options.set_height) ? options.set_height : options.setHeight;
                        options.axis = (options.horizontalScroll) ? "x" : _findAxis(options.axis);
                        options.scrollInertia = options.scrollInertia > 0 && options.scrollInertia < 17 ? 17 : options.scrollInertia;
                        if (typeof options.mouseWheel !== "object" && options.mouseWheel == true) { /* old school mouseWheel option (non-object) */
                            options.mouseWheel = {enable: true, scrollAmount: "auto", axis: "y", preventDefault: false, deltaFactor: "auto", normalizeDelta: false, invert: false}
                        }
                        options.mouseWheel.scrollAmount = !options.mouseWheelPixels ? options.mouseWheel.scrollAmount : options.mouseWheelPixels;
                        options.mouseWheel.normalizeDelta = !options.advanced.normalizeMouseWheelDelta ? options.mouseWheel.normalizeDelta : options.advanced.normalizeMouseWheelDelta;
                        options.scrollButtons.scrollType = _findScrollButtonsType(options.scrollButtons.scrollType);

                        _theme(options); /* theme-specific options */

                        /* plugin constructor */
                        return $(selector).each(function () {

                            var $this = $(this);

                            if (!$this.data(pluginPfx)) { /* prevent multiple instantiations */

                                /* store options and create objects in jquery data */
                                $this.data(pluginPfx, {
                                    idx: ++totalInstances, /* instance index */
                                    opt: options, /* options */
                                    scrollRatio: {y: null, x: null}, /* scrollbar to content ratio */
                                    overflowed: null, /* overflowed axis */
                                    contentReset: {y: null, x: null}, /* object to check when content resets */
                                    bindEvents: false, /* object to check if events are bound */
                                    tweenRunning: false, /* object to check if tween is running */
                                    sequential: {}, /* sequential scrolling object */
                                    langDir: $this.css("direction"), /* detect/store direction (ltr or rtl) */
                                    cbOffsets: null, /* object to check whether callback offsets always trigger */
                                    /*
                                     object to check how scrolling events where last triggered
                                     "internal" (default - triggered by this script), "external" (triggered by other scripts, e.g. via scrollTo method)
                                     usage: object.data("mCS").trigger
                                     */
                                    trigger: null
                                });

                                var d = $this.data(pluginPfx), o = d.opt,
                                        /* HTML data attributes */
                                        htmlDataAxis = $this.data("mcs-axis"), htmlDataSbPos = $this.data("mcs-scrollbar-position"), htmlDataTheme = $this.data("mcs-theme");

                                if (htmlDataAxis) {
                                    o.axis = htmlDataAxis;
                                } /* usage example: data-mcs-axis="y" */
                                if (htmlDataSbPos) {
                                    o.scrollbarPosition = htmlDataSbPos;
                                } /* usage example: data-mcs-scrollbar-position="outside" */
                                if (htmlDataTheme) { /* usage example: data-mcs-theme="minimal" */
                                    o.theme = htmlDataTheme;
                                    _theme(o); /* theme-specific options */
                                }

                                _pluginMarkup.call(this); /* add plugin markup */

                                $("#mCSB_" + d.idx + "_container img:not(." + classes[2] + ")").addClass(classes[2]); /* flag loaded images */

                                methods.update.call(null, $this); /* call the update method */

                            }

                        });

                    },
                    /* ---------------------------------------- */



                    /*
                     plugin update method
                     updates content and scrollbar(s) values, events and status
                     ----------------------------------------
                     usage: $(selector).mCustomScrollbar("update");
                     */

                    update: function (el, cb) {

                        var selector = el || _selector.call(this); /* validate selector */

                        return $(selector).each(function () {

                            var $this = $(this);

                            if ($this.data(pluginPfx)) { /* check if plugin has initialized */

                                var d = $this.data(pluginPfx), o = d.opt,
                                        mCSB_container = $("#mCSB_" + d.idx + "_container"),
                                        mCSB_dragger = [$("#mCSB_" + d.idx + "_dragger_vertical"), $("#mCSB_" + d.idx + "_dragger_horizontal")];

                                if (!mCSB_container.length) {
                                    return;
                                }

                                if (d.tweenRunning) {
                                    _stop($this);
                                } /* stop any running tweens while updating */

                                /* if element was disabled or destroyed, remove class(es) */
                                if ($this.hasClass(classes[3])) {
                                    $this.removeClass(classes[3]);
                                }
                                if ($this.hasClass(classes[4])) {
                                    $this.removeClass(classes[4]);
                                }

                                _maxHeight.call(this); /* detect/set css max-height value */

                                _expandContentHorizontally.call(this); /* expand content horizontally */

                                if (o.axis !== "y" && !o.advanced.autoExpandHorizontalScroll) {
                                    mCSB_container.css("width", _contentWidth(mCSB_container.children()));
                                }

                                d.overflowed = _overflowed.call(this); /* determine if scrolling is required */

                                _scrollbarVisibility.call(this); /* show/hide scrollbar(s) */

                                /* auto-adjust scrollbar dragger length analogous to content */
                                if (o.autoDraggerLength) {
                                    _setDraggerLength.call(this);
                                }

                                _scrollRatio.call(this); /* calculate and store scrollbar to content ratio */

                                _bindEvents.call(this); /* bind scrollbar events */

                                /* reset scrolling position and/or events */
                                var to = [Math.abs(mCSB_container[0].offsetTop), Math.abs(mCSB_container[0].offsetLeft)];
                                if (o.axis !== "x") { /* y/yx axis */
                                    if (!d.overflowed[0]) { /* y scrolling is not required */
                                        _resetContentPosition.call(this); /* reset content position */
                                        if (o.axis === "y") {
                                            _unbindEvents.call(this);
                                        } else if (o.axis === "yx" && d.overflowed[1]) {
                                            _scrollTo($this, to[1].toString(), {dir: "x", dur: 0, overwrite: "none"});
                                        }
                                    } else if (mCSB_dragger[0].height() > mCSB_dragger[0].parent().height()) {
                                        _resetContentPosition.call(this); /* reset content position */
                                    } else { /* y scrolling is required */
                                        _scrollTo($this, to[0].toString(), {dir: "y", dur: 0, overwrite: "none"});
                                        d.contentReset.y = null;
                                    }
                                }
                                if (o.axis !== "y") { /* x/yx axis */
                                    if (!d.overflowed[1]) { /* x scrolling is not required */
                                        _resetContentPosition.call(this); /* reset content position */
                                        if (o.axis === "x") {
                                            _unbindEvents.call(this);
                                        } else if (o.axis === "yx" && d.overflowed[0]) {
                                            _scrollTo($this, to[0].toString(), {dir: "y", dur: 0, overwrite: "none"});
                                        }
                                    } else if (mCSB_dragger[1].width() > mCSB_dragger[1].parent().width()) {
                                        _resetContentPosition.call(this); /* reset content position */
                                    } else { /* x scrolling is required */
                                        _scrollTo($this, to[1].toString(), {dir: "x", dur: 0, overwrite: "none"});
                                        d.contentReset.x = null;
                                    }
                                }

                                /* callbacks: onImageLoad, onSelectorChange, onUpdate */
                                if (cb && d) {
                                    if (cb === 2 && o.callbacks.onImageLoad && typeof o.callbacks.onImageLoad === "function") {
                                        o.callbacks.onImageLoad.call(this);
                                    } else if (cb === 3 && o.callbacks.onSelectorChange && typeof o.callbacks.onSelectorChange === "function") {
                                        o.callbacks.onSelectorChange.call(this);
                                    } else if (o.callbacks.onUpdate && typeof o.callbacks.onUpdate === "function") {
                                        o.callbacks.onUpdate.call(this);
                                    }
                                }

                                _autoUpdate.call(this); /* initialize automatic updating (for dynamic content, fluid layouts etc.) */

                            }

                        });

                    },
                    /* ---------------------------------------- */



                    /*
                     plugin scrollTo method
                     triggers a scrolling event to a specific value
                     ----------------------------------------
                     usage: $(selector).mCustomScrollbar("scrollTo",value,options);
                     */

                    scrollTo: function (val, options) {

                        /* prevent silly things like $(selector).mCustomScrollbar("scrollTo",undefined); */
                        if (typeof val == "undefined" || val == null) {
                            return;
                        }

                        var selector = _selector.call(this); /* validate selector */

                        return $(selector).each(function () {

                            var $this = $(this);

                            if ($this.data(pluginPfx)) { /* check if plugin has initialized */

                                var d = $this.data(pluginPfx), o = d.opt,
                                        /* method default options */
                                        methodDefaults = {
                                            trigger: "external", /* method is by default triggered externally (e.g. from other scripts) */
                                            scrollInertia: o.scrollInertia, /* scrolling inertia (animation duration) */
                                            scrollEasing: "mcsEaseInOut", /* animation easing */
                                            moveDragger: false, /* move dragger instead of content */
                                            timeout: 60, /* scroll-to delay */
                                            callbacks: true, /* enable/disable callbacks */
                                            onStart: true,
                                            onUpdate: true,
                                            onComplete: true
                                        },
                                methodOptions = $.extend(true, {}, methodDefaults, options),
                                        to = _arr.call(this, val), dur = methodOptions.scrollInertia > 0 && methodOptions.scrollInertia < 17 ? 17 : methodOptions.scrollInertia;

                                /* translate yx values to actual scroll-to positions */
                                to[0] = _to.call(this, to[0], "y");
                                to[1] = _to.call(this, to[1], "x");

                                /*
                                 check if scroll-to value moves the dragger instead of content.
                                 Only pixel values apply on dragger (e.g. 100, "100px", "-=100" etc.)
                                 */
                                if (methodOptions.moveDragger) {
                                    to[0] *= d.scrollRatio.y;
                                    to[1] *= d.scrollRatio.x;
                                }

                                methodOptions.dur = dur;

                                setTimeout(function () {
                                    /* do the scrolling */
                                    if (to[0] !== null && typeof to[0] !== "undefined" && o.axis !== "x" && d.overflowed[0]) { /* scroll y */
                                        methodOptions.dir = "y";
                                        methodOptions.overwrite = "all";
                                        _scrollTo($this, to[0].toString(), methodOptions);
                                    }
                                    if (to[1] !== null && typeof to[1] !== "undefined" && o.axis !== "y" && d.overflowed[1]) { /* scroll x */
                                        methodOptions.dir = "x";
                                        methodOptions.overwrite = "none";
                                        _scrollTo($this, to[1].toString(), methodOptions);
                                    }
                                }, methodOptions.timeout);

                            }

                        });

                    },
                    /* ---------------------------------------- */



                    /*
                     plugin stop method
                     stops scrolling animation
                     ----------------------------------------
                     usage: $(selector).mCustomScrollbar("stop");
                     */
                    stop: function () {

                        var selector = _selector.call(this); /* validate selector */

                        return $(selector).each(function () {

                            var $this = $(this);

                            if ($this.data(pluginPfx)) { /* check if plugin has initialized */

                                _stop($this);

                            }

                        });

                    },
                    /* ---------------------------------------- */



                    /*
                     plugin disable method
                     temporarily disables the scrollbar(s)
                     ----------------------------------------
                     usage: $(selector).mCustomScrollbar("disable",reset);
                     reset (boolean): resets content position to 0
                     */
                    disable: function (r) {

                        var selector = _selector.call(this); /* validate selector */

                        return $(selector).each(function () {

                            var $this = $(this);

                            if ($this.data(pluginPfx)) { /* check if plugin has initialized */

                                var d = $this.data(pluginPfx);

                                _autoUpdate.call(this, "remove"); /* remove automatic updating */

                                _unbindEvents.call(this); /* unbind events */

                                if (r) {
                                    _resetContentPosition.call(this);
                                } /* reset content position */

                                _scrollbarVisibility.call(this, true); /* show/hide scrollbar(s) */

                                $this.addClass(classes[3]); /* add disable class */

                            }

                        });

                    },
                    /* ---------------------------------------- */



                    /*
                     plugin destroy method
                     completely removes the scrollbar(s) and returns the element to its original state
                     ----------------------------------------
                     usage: $(selector).mCustomScrollbar("destroy");
                     */
                    destroy: function () {

                        var selector = _selector.call(this); /* validate selector */

                        return $(selector).each(function () {

                            var $this = $(this);

                            if ($this.data(pluginPfx)) { /* check if plugin has initialized */

                                var d = $this.data(pluginPfx), o = d.opt,
                                        mCustomScrollBox = $("#mCSB_" + d.idx),
                                        mCSB_container = $("#mCSB_" + d.idx + "_container"),
                                        scrollbar = $(".mCSB_" + d.idx + "_scrollbar");

                                if (o.live) {
                                    removeLiveTimers(o.liveSelector || $(selector).selector);
                                } /* remove live timers */

                                _autoUpdate.call(this, "remove"); /* remove automatic updating */

                                _unbindEvents.call(this); /* unbind events */

                                _resetContentPosition.call(this); /* reset content position */

                                $this.removeData(pluginPfx); /* remove plugin data object */

                                _delete(this, "mcs"); /* delete callbacks object */

                                /* remove plugin markup */
                                scrollbar.remove(); /* remove scrollbar(s) first (those can be either inside or outside plugin's inner wrapper) */
                                mCSB_container.find("img." + classes[2]).removeClass(classes[2]); /* remove loaded images flag */
                                mCustomScrollBox.replaceWith(mCSB_container.contents()); /* replace plugin's inner wrapper with the original content */
                                /* remove plugin classes from the element and add destroy class */
                                $this.removeClass(pluginNS + " _" + pluginPfx + "_" + d.idx + " " + classes[6] + " " + classes[7] + " " + classes[5] + " " + classes[3]).addClass(classes[4]);

                            }

                        });

                    }
                    /* ---------------------------------------- */

                },
        /*
         ----------------------------------------
         FUNCTIONS
         ----------------------------------------
         */

        /* validates selector (if selector is invalid or undefined uses the default one) */
        _selector = function () {
            return (typeof $(this) !== "object" || $(this).length < 1) ? defaultSelector : this;
        },
                /* -------------------- */


                /* changes options according to theme */
                _theme = function (obj) {
                    var fixedSizeScrollbarThemes = ["rounded", "rounded-dark", "rounded-dots", "rounded-dots-dark"],
                            nonExpandedScrollbarThemes = ["rounded-dots", "rounded-dots-dark", "3d", "3d-dark", "3d-thick", "3d-thick-dark", "inset", "inset-dark", "inset-2", "inset-2-dark", "inset-3", "inset-3-dark"],
                            disabledScrollButtonsThemes = ["minimal", "minimal-dark"],
                            enabledAutoHideScrollbarThemes = ["minimal", "minimal-dark"],
                            scrollbarPositionOutsideThemes = ["minimal", "minimal-dark"];
                    obj.autoDraggerLength = $.inArray(obj.theme, fixedSizeScrollbarThemes) > -1 ? false : obj.autoDraggerLength;
                    obj.autoExpandScrollbar = $.inArray(obj.theme, nonExpandedScrollbarThemes) > -1 ? false : obj.autoExpandScrollbar;
                    obj.scrollButtons.enable = $.inArray(obj.theme, disabledScrollButtonsThemes) > -1 ? false : obj.scrollButtons.enable;
                    obj.autoHideScrollbar = $.inArray(obj.theme, enabledAutoHideScrollbarThemes) > -1 ? true : obj.autoHideScrollbar;
                    obj.scrollbarPosition = $.inArray(obj.theme, scrollbarPositionOutsideThemes) > -1 ? "outside" : obj.scrollbarPosition;
                },
                /* -------------------- */


                /* live option timers removal */
                removeLiveTimers = function (selector) {
                    if (liveTimers[selector]) {
                        clearTimeout(liveTimers[selector]);
                        _delete(liveTimers, selector);
                    }
                },
                /* -------------------- */


                /* normalizes axis option to valid values: "y", "x", "yx" */
                _findAxis = function (val) {
                    return (val === "yx" || val === "xy" || val === "auto") ? "yx" : (val === "x" || val === "horizontal") ? "x" : "y";
                },
                /* -------------------- */


                /* normalizes scrollButtons.scrollType option to valid values: "stepless", "stepped" */
                _findScrollButtonsType = function (val) {
                    return (val === "stepped" || val === "pixels" || val === "step" || val === "click") ? "stepped" : "stepless";
                },
                /* -------------------- */


                /* generates plugin markup */
                _pluginMarkup = function () {
                    var $this = $(this), d = $this.data(pluginPfx), o = d.opt,
                            expandClass = o.autoExpandScrollbar ? " " + classes[1] + "_expand" : "",
                            scrollbar = ["<div id='mCSB_" + d.idx + "_scrollbar_vertical' class='mCSB_scrollTools mCSB_" + d.idx + "_scrollbar mCS-" + o.theme + " mCSB_scrollTools_vertical" + expandClass + "'><div class='" + classes[12] + "'><div id='mCSB_" + d.idx + "_dragger_vertical' class='mCSB_dragger' style='position:absolute;' oncontextmenu='return false;'><div class='mCSB_dragger_bar' /></div><div class='mCSB_draggerRail' /></div></div>", "<div id='mCSB_" + d.idx + "_scrollbar_horizontal' class='mCSB_scrollTools mCSB_" + d.idx + "_scrollbar mCS-" + o.theme + " mCSB_scrollTools_horizontal" + expandClass + "'><div class='" + classes[12] + "'><div id='mCSB_" + d.idx + "_dragger_horizontal' class='mCSB_dragger' style='position:absolute;' oncontextmenu='return false;'><div class='mCSB_dragger_bar' /></div><div class='mCSB_draggerRail' /></div></div>"],
                            wrapperClass = o.axis === "yx" ? "mCSB_vertical_horizontal" : o.axis === "x" ? "mCSB_horizontal" : "mCSB_vertical",
                            scrollbars = o.axis === "yx" ? scrollbar[0] + scrollbar[1] : o.axis === "x" ? scrollbar[1] : scrollbar[0],
                            contentWrapper = o.axis === "yx" ? "<div id='mCSB_" + d.idx + "_container_wrapper' class='mCSB_container_wrapper' />" : "",
                            autoHideClass = o.autoHideScrollbar ? " " + classes[6] : "",
                            scrollbarDirClass = (o.axis !== "x" && d.langDir === "rtl") ? " " + classes[7] : "";
                    if (o.setWidth) {
                        $this.css("width", o.setWidth);
                    } /* set element width */
                    if (o.setHeight) {
                        $this.css("height", o.setHeight);
                    } /* set element height */
                    o.setLeft = (o.axis !== "y" && d.langDir === "rtl") ? "989999px" : o.setLeft; /* adjust left position for rtl direction */
                    $this.addClass(pluginNS + " _" + pluginPfx + "_" + d.idx + autoHideClass + scrollbarDirClass).wrapInner("<div id='mCSB_" + d.idx + "' class='mCustomScrollBox mCS-" + o.theme + " " + wrapperClass + "'><div id='mCSB_" + d.idx + "_container' class='mCSB_container' style='position:relative; top:" + o.setTop + "; left:" + o.setLeft + ";' dir=" + d.langDir + " /></div>");
                    var mCustomScrollBox = $("#mCSB_" + d.idx),
                            mCSB_container = $("#mCSB_" + d.idx + "_container");
                    if (o.axis !== "y" && !o.advanced.autoExpandHorizontalScroll) {
                        mCSB_container.css("width", _contentWidth(mCSB_container.children()));
                    }
                    if (o.scrollbarPosition === "outside") {
                        if ($this.css("position") === "static") { /* requires elements with non-static position */
                            $this.css("position", "relative");
                        }
                        $this.css("overflow", "visible");
                        mCustomScrollBox.addClass("mCSB_outside").after(scrollbars);
                    } else {
                        mCustomScrollBox.addClass("mCSB_inside").append(scrollbars);
                        mCSB_container.wrap(contentWrapper);
                    }
                    _scrollButtons.call(this); /* add scrollbar buttons */
                    /* minimum dragger length */
                    var mCSB_dragger = [$("#mCSB_" + d.idx + "_dragger_vertical"), $("#mCSB_" + d.idx + "_dragger_horizontal")];
                    mCSB_dragger[0].css("min-height", mCSB_dragger[0].height());
                    mCSB_dragger[1].css("min-width", mCSB_dragger[1].width());
                },
                /* -------------------- */


                /* calculates content width */
                _contentWidth = function (el) {
                    return Math.max.apply(Math, el.map(function () {
                        return $(this).outerWidth(true);
                    }).get());
                },
                /* -------------------- */


                /* expands content horizontally */
                _expandContentHorizontally = function () {
                    var $this = $(this), d = $this.data(pluginPfx), o = d.opt,
                            mCSB_container = $("#mCSB_" + d.idx + "_container");
                    if (o.advanced.autoExpandHorizontalScroll && o.axis !== "y") {
                        /*
                         wrap content with an infinite width div and set its position to absolute and width to auto.
                         Setting width to auto before calculating the actual width is important!
                         We must let the browser set the width as browser zoom values are impossible to calculate.
                         */
                        mCSB_container.css({"position": "absolute", "width": "auto"})
                                .wrap("<div class='mCSB_h_wrapper' style='position:relative; left:0; width:999999px;' />")
                                .css({/* set actual width, original position and un-wrap */
                                    /*
                                     get the exact width (with decimals) and then round-up.
                                     Using jquery outerWidth() will round the width value which will mess up with inner elements that have non-integer width
                                     */
                                    "width": (Math.ceil(mCSB_container[0].getBoundingClientRect().right + 0.4) - Math.floor(mCSB_container[0].getBoundingClientRect().left)),
                                    "position": "relative"
                                }).unwrap();
                    }
                },
                /* -------------------- */


                /* adds scrollbar buttons */
                _scrollButtons = function () {
                    var $this = $(this), d = $this.data(pluginPfx), o = d.opt,
                            mCSB_scrollTools = $(".mCSB_" + d.idx + "_scrollbar:first"),
                            tabindex = !_isNumeric(o.scrollButtons.tabindex) ? "" : "tabindex='" + o.scrollButtons.tabindex + "'",
                            btnHTML = [
                                "<a href='#' class='" + classes[13] + "' oncontextmenu='return false;' " + tabindex + " />",
                                "<a href='#' class='" + classes[14] + "' oncontextmenu='return false;' " + tabindex + " />",
                                "<a href='#' class='" + classes[15] + "' oncontextmenu='return false;' " + tabindex + " />",
                                "<a href='#' class='" + classes[16] + "' oncontextmenu='return false;' " + tabindex + " />"
                            ],
                            btn = [(o.axis === "x" ? btnHTML[2] : btnHTML[0]), (o.axis === "x" ? btnHTML[3] : btnHTML[1]), btnHTML[2], btnHTML[3]];
                    if (o.scrollButtons.enable) {
                        mCSB_scrollTools.prepend(btn[0]).append(btn[1]).next(".mCSB_scrollTools").prepend(btn[2]).append(btn[3]);
                    }
                },
                /* -------------------- */


                /* detects/sets css max-height value */
                _maxHeight = function () {
                    var $this = $(this), d = $this.data(pluginPfx),
                            mCustomScrollBox = $("#mCSB_" + d.idx),
                            mh = $this.css("max-height") || "none", pct = mh.indexOf("%") !== -1,
                            bs = $this.css("box-sizing");
                    if (mh !== "none") {
                        var val = pct ? $this.parent().height() * parseInt(mh) / 100 : parseInt(mh);
                        /* if element's css box-sizing is "border-box", subtract any paddings and/or borders from max-height value */
                        if (bs === "border-box") {
                            val -= (($this.innerHeight() - $this.height()) + ($this.outerHeight() - $this.innerHeight()));
                        }
                        mCustomScrollBox.css("max-height", Math.round(val));
                    }
                },
                /* -------------------- */


                /* auto-adjusts scrollbar dragger length */
                _setDraggerLength = function () {
                    var $this = $(this), d = $this.data(pluginPfx),
                            mCustomScrollBox = $("#mCSB_" + d.idx),
                            mCSB_container = $("#mCSB_" + d.idx + "_container"),
                            mCSB_dragger = [$("#mCSB_" + d.idx + "_dragger_vertical"), $("#mCSB_" + d.idx + "_dragger_horizontal")],
                            ratio = [mCustomScrollBox.height() / mCSB_container.outerHeight(false), mCustomScrollBox.width() / mCSB_container.outerWidth(false)],
                            l = [
                                parseInt(mCSB_dragger[0].css("min-height")), Math.round(ratio[0] * mCSB_dragger[0].parent().height()),
                                parseInt(mCSB_dragger[1].css("min-width")), Math.round(ratio[1] * mCSB_dragger[1].parent().width())
                            ],
                            h = oldIE && (l[1] < l[0]) ? l[0] : l[1], w = oldIE && (l[3] < l[2]) ? l[2] : l[3];
                    mCSB_dragger[0].css({
                        "height": h, "max-height": (mCSB_dragger[0].parent().height() - 10)
                    }).find(".mCSB_dragger_bar").css({"line-height": l[0] + "px"});
                    mCSB_dragger[1].css({
                        "width": w, "max-width": (mCSB_dragger[1].parent().width() - 10)
                    });
                },
                /* -------------------- */


                /* calculates scrollbar to content ratio */
                _scrollRatio = function () {
                    var $this = $(this), d = $this.data(pluginPfx),
                            mCustomScrollBox = $("#mCSB_" + d.idx),
                            mCSB_container = $("#mCSB_" + d.idx + "_container"),
                            mCSB_dragger = [$("#mCSB_" + d.idx + "_dragger_vertical"), $("#mCSB_" + d.idx + "_dragger_horizontal")],
                            scrollAmount = [mCSB_container.outerHeight(false) - mCustomScrollBox.height(), mCSB_container.outerWidth(false) - mCustomScrollBox.width()],
                            ratio = [
                                scrollAmount[0] / (mCSB_dragger[0].parent().height() - mCSB_dragger[0].height()),
                                scrollAmount[1] / (mCSB_dragger[1].parent().width() - mCSB_dragger[1].width())
                            ];
                    d.scrollRatio = {y: ratio[0], x: ratio[1]};
                },
                /* -------------------- */


                /* toggles scrolling classes */
                _onDragClasses = function (el, action, xpnd) {
                    var expandClass = xpnd ? classes[0] + "_expanded" : "",
                            scrollbar = el.closest(".mCSB_scrollTools");
                    if (action === "active") {
                        el.toggleClass(classes[0] + " " + expandClass);
                        scrollbar.toggleClass(classes[1]);
                        el[0]._draggable = el[0]._draggable ? 0 : 1;
                    } else {
                        if (!el[0]._draggable) {
                            if (action === "hide") {
                                el.removeClass(classes[0]);
                                scrollbar.removeClass(classes[1]);
                            } else {
                                el.addClass(classes[0]);
                                scrollbar.addClass(classes[1]);
                            }
                        }
                    }
                },
                /* -------------------- */


                /* checks if content overflows its container to determine if scrolling is required */
                _overflowed = function () {
                    var $this = $(this), d = $this.data(pluginPfx),
                            mCustomScrollBox = $("#mCSB_" + d.idx),
                            mCSB_container = $("#mCSB_" + d.idx + "_container"),
                            contentHeight = d.overflowed == null ? mCSB_container.height() : mCSB_container.outerHeight(false),
                            contentWidth = d.overflowed == null ? mCSB_container.width() : mCSB_container.outerWidth(false);
                    return [contentHeight > mCustomScrollBox.height(), contentWidth > mCustomScrollBox.width()];
                },
                /* -------------------- */


                /* resets content position to 0 */
                _resetContentPosition = function () {
                    var $this = $(this), d = $this.data(pluginPfx), o = d.opt,
                            mCustomScrollBox = $("#mCSB_" + d.idx),
                            mCSB_container = $("#mCSB_" + d.idx + "_container"),
                            mCSB_dragger = [$("#mCSB_" + d.idx + "_dragger_vertical"), $("#mCSB_" + d.idx + "_dragger_horizontal")];
                    _stop($this); /* stop any current scrolling before resetting */
                    if ((o.axis !== "x" && !d.overflowed[0]) || (o.axis === "y" && d.overflowed[0])) { /* reset y */
                        mCSB_dragger[0].add(mCSB_container).css("top", 0);
                        _scrollTo($this, "_resetY");
                    }
                    if ((o.axis !== "y" && !d.overflowed[1]) || (o.axis === "x" && d.overflowed[1])) { /* reset x */
                        var cx = dx = 0;
                        if (d.langDir === "rtl") { /* adjust left position for rtl direction */
                            cx = mCustomScrollBox.width() - mCSB_container.outerWidth(false);
                            dx = Math.abs(cx / d.scrollRatio.x);
                        }
                        mCSB_container.css("left", cx);
                        mCSB_dragger[1].css("left", dx);
                        _scrollTo($this, "_resetX");
                    }
                },
                /* -------------------- */


                /* binds scrollbar events */
                _bindEvents = function () {
                    var $this = $(this), d = $this.data(pluginPfx), o = d.opt;
                    if (!d.bindEvents) { /* check if events are already bound */
                        _draggable.call(this);
                        if (o.contentTouchScroll) {
                            _contentDraggable.call(this);
                        }
                        _selectable.call(this);
                        if (o.mouseWheel.enable) { /* bind mousewheel fn when plugin is available */
                            function _mwt() {
                                mousewheelTimeout = setTimeout(function () {
                                    if (!$.event.special.mousewheel) {
                                        _mwt();
                                    } else {
                                        clearTimeout(mousewheelTimeout);
                                        _mousewheel.call($this[0]);
                                    }
                                }, 100);
                            }
                            var mousewheelTimeout;
                            _mwt();
                        }
                        _draggerRail.call(this);
                        _wrapperScroll.call(this);
                        if (o.advanced.autoScrollOnFocus) {
                            _focus.call(this);
                        }
                        if (o.scrollButtons.enable) {
                            _buttons.call(this);
                        }
                        if (o.keyboard.enable) {
                            _keyboard.call(this);
                        }
                        d.bindEvents = true;
                    }
                },
                /* -------------------- */


                /* unbinds scrollbar events */
                _unbindEvents = function () {
                    var $this = $(this), d = $this.data(pluginPfx), o = d.opt,
                            namespace = pluginPfx + "_" + d.idx,
                            sb = ".mCSB_" + d.idx + "_scrollbar",
                            sel = $("#mCSB_" + d.idx + ",#mCSB_" + d.idx + "_container,#mCSB_" + d.idx + "_container_wrapper," + sb + " ." + classes[12] + ",#mCSB_" + d.idx + "_dragger_vertical,#mCSB_" + d.idx + "_dragger_horizontal," + sb + ">a"),
                            mCSB_container = $("#mCSB_" + d.idx + "_container");
                    if (o.advanced.releaseDraggableSelectors) {
                        sel.add($(o.advanced.releaseDraggableSelectors));
                    }
                    if (d.bindEvents) { /* check if events are bound */
                        /* unbind namespaced events from document/selectors */
                        $(document).unbind("." + namespace);
                        sel.each(function () {
                            $(this).unbind("." + namespace);
                        });
                        /* clear and delete timeouts/objects */
                        clearTimeout($this[0]._focusTimeout);
                        _delete($this[0], "_focusTimeout");
                        clearTimeout(d.sequential.step);
                        _delete(d.sequential, "step");
                        clearTimeout(mCSB_container[0].onCompleteTimeout);
                        _delete(mCSB_container[0], "onCompleteTimeout");
                        d.bindEvents = false;
                    }
                },
                /* -------------------- */


                /* toggles scrollbar visibility */
                _scrollbarVisibility = function (disabled) {
                    var $this = $(this), d = $this.data(pluginPfx), o = d.opt,
                            contentWrapper = $("#mCSB_" + d.idx + "_container_wrapper"),
                            content = contentWrapper.length ? contentWrapper : $("#mCSB_" + d.idx + "_container"),
                            scrollbar = [$("#mCSB_" + d.idx + "_scrollbar_vertical"), $("#mCSB_" + d.idx + "_scrollbar_horizontal")],
                            mCSB_dragger = [scrollbar[0].find(".mCSB_dragger"), scrollbar[1].find(".mCSB_dragger")];
                    if (o.axis !== "x") {
                        if (d.overflowed[0] && !disabled) {
                            scrollbar[0].add(mCSB_dragger[0]).add(scrollbar[0].children("a")).css("display", "block");
                            content.removeClass(classes[8] + " " + classes[10]);
                        } else {
                            if (o.alwaysShowScrollbar) {
                                if (o.alwaysShowScrollbar !== 2) {
                                    mCSB_dragger[0].css("display", "none");
                                }
                                content.removeClass(classes[10]);
                            } else {
                                scrollbar[0].css("display", "none");
                                content.addClass(classes[10]);
                            }
                            content.addClass(classes[8]);
                        }
                    }
                    if (o.axis !== "y") {
                        if (d.overflowed[1] && !disabled) {
                            scrollbar[1].add(mCSB_dragger[1]).add(scrollbar[1].children("a")).css("display", "block");
                            content.removeClass(classes[9] + " " + classes[11]);
                        } else {
                            if (o.alwaysShowScrollbar) {
                                if (o.alwaysShowScrollbar !== 2) {
                                    mCSB_dragger[1].css("display", "none");
                                }
                                content.removeClass(classes[11]);
                            } else {
                                scrollbar[1].css("display", "none");
                                content.addClass(classes[11]);
                            }
                            content.addClass(classes[9]);
                        }
                    }
                    if (!d.overflowed[0] && !d.overflowed[1]) {
                        $this.addClass(classes[5]);
                    } else {
                        $this.removeClass(classes[5]);
                    }
                },
                /* -------------------- */


                /* returns input coordinates of pointer, touch and mouse events (relative to document) */
                _coordinates = function (e) {
                    var t = e.type;
                    switch (t) {
                        case "pointerdown":
                        case "MSPointerDown":
                        case "pointermove":
                        case "MSPointerMove":
                        case "pointerup":
                        case "MSPointerUp":
                            return e.target.ownerDocument !== document ? [e.originalEvent.screenY, e.originalEvent.screenX, false] : [e.originalEvent.pageY, e.originalEvent.pageX, false];
                            break;
                        case "touchstart":
                        case "touchmove":
                        case "touchend":
                            var touch = e.originalEvent.touches[0] || e.originalEvent.changedTouches[0],
                                    touches = e.originalEvent.touches.length || e.originalEvent.changedTouches.length;
                            return e.target.ownerDocument !== document ? [touch.screenY, touch.screenX, touches > 1] : [touch.pageY, touch.pageX, touches > 1];
                            break;
                        default:
                            return [e.pageY, e.pageX, false];
                    }
                },
                /* -------------------- */


                /*
                 SCROLLBAR DRAG EVENTS
                 scrolls content via scrollbar dragging
                 */
                _draggable = function () {
                    var $this = $(this), d = $this.data(pluginPfx), o = d.opt,
                            namespace = pluginPfx + "_" + d.idx,
                            draggerId = ["mCSB_" + d.idx + "_dragger_vertical", "mCSB_" + d.idx + "_dragger_horizontal"],
                            mCSB_container = $("#mCSB_" + d.idx + "_container"),
                            mCSB_dragger = $("#" + draggerId[0] + ",#" + draggerId[1]),
                            draggable, dragY, dragX,
                            rds = o.advanced.releaseDraggableSelectors ? mCSB_dragger.add($(o.advanced.releaseDraggableSelectors)) : mCSB_dragger;
                    mCSB_dragger.bind("mousedown." + namespace + " touchstart." + namespace + " pointerdown." + namespace + " MSPointerDown." + namespace, function (e) {
                        e.stopImmediatePropagation();
                        e.preventDefault();
                        if (!_mouseBtnLeft(e)) {
                            return;
                        } /* left mouse button only */
                        touchActive = true;
                        if (oldIE) {
                            document.onselectstart = function () {
                                return false;
                            }
                        } /* disable text selection for IE < 9 */
                        _iframe(false); /* enable scrollbar dragging over iframes by disabling their events */
                        _stop($this);
                        draggable = $(this);
                        var offset = draggable.offset(), y = _coordinates(e)[0] - offset.top, x = _coordinates(e)[1] - offset.left,
                                h = draggable.height() + offset.top, w = draggable.width() + offset.left;
                        if (y < h && y > 0 && x < w && x > 0) {
                            dragY = y;
                            dragX = x;
                        }
                        _onDragClasses(draggable, "active", o.autoExpandScrollbar);
                    }).bind("touchmove." + namespace, function (e) {
                        e.stopImmediatePropagation();
                        e.preventDefault();
                        var offset = draggable.offset(), y = _coordinates(e)[0] - offset.top, x = _coordinates(e)[1] - offset.left;
                        _drag(dragY, dragX, y, x);
                    });
                    $(document).bind("mousemove." + namespace + " pointermove." + namespace + " MSPointerMove." + namespace, function (e) {
                        if (draggable) {
                            var offset = draggable.offset(), y = _coordinates(e)[0] - offset.top, x = _coordinates(e)[1] - offset.left;
                            if (dragY === y) {
                                return;
                            } /* has it really moved? */
                            _drag(dragY, dragX, y, x);
                        }
                    }).add(rds).bind("mouseup." + namespace + " touchend." + namespace + " pointerup." + namespace + " MSPointerUp." + namespace, function (e) {
                        if (draggable) {
                            _onDragClasses(draggable, "active", o.autoExpandScrollbar);
                            draggable = null;
                        }
                        touchActive = false;
                        if (oldIE) {
                            document.onselectstart = null;
                        } /* enable text selection for IE < 9 */
                        _iframe(true); /* enable iframes events */
                    });
                    function _iframe(evt) {
                        var el = mCSB_container.find("iframe");
                        if (!el.length) {
                            return;
                        } /* check if content contains iframes */
                        var val = !evt ? "none" : "auto";
                        el.css("pointer-events", val); /* for IE11, iframe's display property should not be "block" */
                    }
                    function _drag(dragY, dragX, y, x) {
                        mCSB_container[0].idleTimer = o.scrollInertia < 233 ? 250 : 0;
                        if (draggable.attr("id") === draggerId[1]) {
                            var dir = "x", to = ((draggable[0].offsetLeft - dragX) + x) * d.scrollRatio.x;
                        } else {
                            var dir = "y", to = ((draggable[0].offsetTop - dragY) + y) * d.scrollRatio.y;
                        }
                        _scrollTo($this, to.toString(), {dir: dir, drag: true});
                    }
                },
                /* -------------------- */


                /*
                 TOUCH SWIPE EVENTS
                 scrolls content via touch swipe
                 Emulates the native touch-swipe scrolling with momentum found in iOS, Android and WP devices
                 */
                _contentDraggable = function () {
                    var $this = $(this), d = $this.data(pluginPfx), o = d.opt,
                            namespace = pluginPfx + "_" + d.idx,
                            mCustomScrollBox = $("#mCSB_" + d.idx),
                            mCSB_container = $("#mCSB_" + d.idx + "_container"),
                            mCSB_dragger = [$("#mCSB_" + d.idx + "_dragger_vertical"), $("#mCSB_" + d.idx + "_dragger_horizontal")],
                            dragY, dragX, touchStartY, touchStartX, touchMoveY = [], touchMoveX = [], startTime, runningTime, endTime, distance, speed, amount,
                            durA = 0, durB, overwrite = o.axis === "yx" ? "none" : "all", touchIntent = [], touchDrag, docDrag,
                            iframe = mCSB_container.find("iframe"),
                            events = [
                                "touchstart." + namespace + " pointerdown." + namespace + " MSPointerDown." + namespace, //start
                                "touchmove." + namespace + " pointermove." + namespace + " MSPointerMove." + namespace, //move
                                "touchend." + namespace + " pointerup." + namespace + " MSPointerUp." + namespace //end
                            ];
                    mCSB_container.bind(events[0], function (e) {
                        _onTouchstart(e);
                    }).bind(events[1], function (e) {
                        _onTouchmove(e);
                    });
                    mCustomScrollBox.bind(events[0], function (e) {
                        _onTouchstart2(e);
                    }).bind(events[2], function (e) {
                        _onTouchend(e);
                    });
                    if (iframe.length) {
                        iframe.each(function () {
                            $(this).load(function () {
                                /* bind events on accessible iframes */
                                if (_canAccessIFrame(this)) {
                                    $(this.contentDocument || this.contentWindow.document).bind(events[0], function (e) {
                                        _onTouchstart(e);
                                        _onTouchstart2(e);
                                    }).bind(events[1], function (e) {
                                        _onTouchmove(e);
                                    }).bind(events[2], function (e) {
                                        _onTouchend(e);
                                    });
                                }
                            });
                        });
                    }
                    function _onTouchstart(e) {
                        if (!_pointerTouch(e) || touchActive || _coordinates(e)[2]) {
                            touchable = 0;
                            return;
                        }
                        touchable = 1;
                        touchDrag = 0;
                        docDrag = 0;
                        $this.removeClass("mCS_touch_action");
                        var offset = mCSB_container.offset();
                        dragY = _coordinates(e)[0] - offset.top;
                        dragX = _coordinates(e)[1] - offset.left;
                        touchIntent = [_coordinates(e)[0], _coordinates(e)[1]];
                    }
                    function _onTouchmove(e) {
                        if (!_pointerTouch(e) || touchActive || _coordinates(e)[2]) {
                            return;
                        }
                        e.stopImmediatePropagation();
                        if (docDrag && !touchDrag) {
                            return;
                        }
                        runningTime = _getTime();
                        var offset = mCustomScrollBox.offset(), y = _coordinates(e)[0] - offset.top, x = _coordinates(e)[1] - offset.left,
                                easing = "mcsLinearOut";
                        touchMoveY.push(y);
                        touchMoveX.push(x);
                        touchIntent[2] = Math.abs(_coordinates(e)[0] - touchIntent[0]);
                        touchIntent[3] = Math.abs(_coordinates(e)[1] - touchIntent[1]);
                        if (d.overflowed[0]) {
                            var limit = mCSB_dragger[0].parent().height() - mCSB_dragger[0].height(),
                                    prevent = ((dragY - y) > 0 && (y - dragY) > -(limit * d.scrollRatio.y) && (touchIntent[3] * 2 < touchIntent[2] || o.axis === "yx"));
                        }
                        if (d.overflowed[1]) {
                            var limitX = mCSB_dragger[1].parent().width() - mCSB_dragger[1].width(),
                                    preventX = ((dragX - x) > 0 && (x - dragX) > -(limitX * d.scrollRatio.x) && (touchIntent[2] * 2 < touchIntent[3] || o.axis === "yx"));
                        }
                        if (prevent || preventX) { /* prevent native document scrolling */
                            e.preventDefault();
                            touchDrag = 1;
                        } else {
                            docDrag = 1;
                            $this.addClass("mCS_touch_action");
                        }
                        amount = o.axis === "yx" ? [(dragY - y), (dragX - x)] : o.axis === "x" ? [null, (dragX - x)] : [(dragY - y), null];
                        mCSB_container[0].idleTimer = 250;
                        if (d.overflowed[0]) {
                            _drag(amount[0], durA, easing, "y", "all", true);
                        }
                        if (d.overflowed[1]) {
                            _drag(amount[1], durA, easing, "x", overwrite, true);
                        }
                    }
                    function _onTouchstart2(e) {
                        if (!_pointerTouch(e) || touchActive || _coordinates(e)[2]) {
                            touchable = 0;
                            return;
                        }
                        touchable = 1;
                        e.stopImmediatePropagation();
                        _stop($this);
                        startTime = _getTime();
                        var offset = mCustomScrollBox.offset();
                        touchStartY = _coordinates(e)[0] - offset.top;
                        touchStartX = _coordinates(e)[1] - offset.left;
                        touchMoveY = [];
                        touchMoveX = [];
                    }
                    function _onTouchend(e) {
                        if (!_pointerTouch(e) || touchActive || _coordinates(e)[2]) {
                            return;
                        }
                        e.stopImmediatePropagation();
                        touchDrag = 0;
                        docDrag = 0;
                        endTime = _getTime();
                        var offset = mCustomScrollBox.offset(), y = _coordinates(e)[0] - offset.top, x = _coordinates(e)[1] - offset.left;
                        if ((endTime - runningTime) > 30) {
                            return;
                        }
                        speed = 1000 / (endTime - startTime);
                        var easing = "mcsEaseOut", slow = speed < 2.5,
                                diff = slow ? [touchMoveY[touchMoveY.length - 2], touchMoveX[touchMoveX.length - 2]] : [0, 0];
                        distance = slow ? [(y - diff[0]), (x - diff[1])] : [y - touchStartY, x - touchStartX];
                        var absDistance = [Math.abs(distance[0]), Math.abs(distance[1])];
                        speed = slow ? [Math.abs(distance[0] / 4), Math.abs(distance[1] / 4)] : [speed, speed];
                        var a = [
                            Math.abs(mCSB_container[0].offsetTop) - (distance[0] * _m((absDistance[0] / speed[0]), speed[0])),
                            Math.abs(mCSB_container[0].offsetLeft) - (distance[1] * _m((absDistance[1] / speed[1]), speed[1]))
                        ];
                        amount = o.axis === "yx" ? [a[0], a[1]] : o.axis === "x" ? [null, a[1]] : [a[0], null];
                        durB = [(absDistance[0] * 4) + o.scrollInertia, (absDistance[1] * 4) + o.scrollInertia];
                        var md = parseInt(o.contentTouchScroll) || 0; /* absolute minimum distance required */
                        amount[0] = absDistance[0] > md ? amount[0] : 0;
                        amount[1] = absDistance[1] > md ? amount[1] : 0;
                        if (d.overflowed[0]) {
                            _drag(amount[0], durB[0], easing, "y", overwrite, false);
                        }
                        if (d.overflowed[1]) {
                            _drag(amount[1], durB[1], easing, "x", overwrite, false);
                        }
                    }
                    function _m(ds, s) {
                        var r = [s * 1.5, s * 2, s / 1.5, s / 2];
                        if (ds > 90) {
                            return s > 4 ? r[0] : r[3];
                        } else if (ds > 60) {
                            return s > 3 ? r[3] : r[2];
                        } else if (ds > 30) {
                            return s > 8 ? r[1] : s > 6 ? r[0] : s > 4 ? s : r[2];
                        } else {
                            return s > 8 ? s : r[3];
                        }
                    }
                    function _drag(amount, dur, easing, dir, overwrite, drag) {
                        if (!amount) {
                            return;
                        }
                        _scrollTo($this, amount.toString(), {dur: dur, scrollEasing: easing, dir: dir, overwrite: overwrite, drag: drag});
                    }
                },
                /* -------------------- */


                /*
                 SELECT TEXT EVENTS
                 scrolls content when text is selected
                 */
                _selectable = function () {
                    var $this = $(this), d = $this.data(pluginPfx), o = d.opt, seq = d.sequential,
                            namespace = pluginPfx + "_" + d.idx,
                            mCSB_container = $("#mCSB_" + d.idx + "_container"),
                            wrapper = mCSB_container.parent(),
                            action;
                    mCSB_container.bind("mousedown." + namespace, function (e) {
                        if (touchable) {
                            return;
                        }
                        if (!action) {
                            action = 1;
                            touchActive = true;
                        }
                    }).add(document).bind("mousemove." + namespace, function (e) {
                        if (!touchable && action && _sel()) {
                            var offset = mCSB_container.offset(),
                                    y = _coordinates(e)[0] - offset.top + mCSB_container[0].offsetTop, x = _coordinates(e)[1] - offset.left + mCSB_container[0].offsetLeft;
                            if (y > 0 && y < wrapper.height() && x > 0 && x < wrapper.width()) {
                                if (seq.step) {
                                    _seq("off", null, "stepped");
                                }
                            } else {
                                if (o.axis !== "x" && d.overflowed[0]) {
                                    if (y < 0) {
                                        _seq("on", 38);
                                    } else if (y > wrapper.height()) {
                                        _seq("on", 40);
                                    }
                                }
                                if (o.axis !== "y" && d.overflowed[1]) {
                                    if (x < 0) {
                                        _seq("on", 37);
                                    } else if (x > wrapper.width()) {
                                        _seq("on", 39);
                                    }
                                }
                            }
                        }
                    }).bind("mouseup." + namespace, function (e) {
                        if (touchable) {
                            return;
                        }
                        if (action) {
                            action = 0;
                            _seq("off", null);
                        }
                        touchActive = false;
                    });
                    function _sel() {
                        return 	window.getSelection ? window.getSelection().toString() :
                                document.selection && document.selection.type != "Control" ? document.selection.createRange().text : 0;
                    }
                    function _seq(a, c, s) {
                        seq.type = s && action ? "stepped" : "stepless";
                        seq.scrollAmount = 10;
                        _sequentialScroll($this, a, c, "mcsLinearOut", s ? 60 : null);
                    }
                },
                /* -------------------- */


                /*
                 MOUSE WHEEL EVENT
                 scrolls content via mouse-wheel
                 via mouse-wheel plugin (https://github.com/brandonaaron/jquery-mousewheel)
                 */
                _mousewheel = function () {
                    if (!$(this).data(pluginPfx)) {
                        return;
                    } /* Check if the scrollbar is ready to use mousewheel events (issue: #185) */
                    var $this = $(this), d = $this.data(pluginPfx), o = d.opt,
                            namespace = pluginPfx + "_" + d.idx,
                            mCustomScrollBox = $("#mCSB_" + d.idx),
                            mCSB_dragger = [$("#mCSB_" + d.idx + "_dragger_vertical"), $("#mCSB_" + d.idx + "_dragger_horizontal")],
                            iframe = $("#mCSB_" + d.idx + "_container").find("iframe");
                    if (iframe.length) {
                        iframe.each(function () {
                            $(this).load(function () {
                                /* bind events on accessible iframes */
                                if (_canAccessIFrame(this)) {
                                    $(this.contentDocument || this.contentWindow.document).bind("mousewheel." + namespace, function (e, delta) {
                                        _onMousewheel(e, delta);
                                    });
                                }
                            });
                        });
                    }
                    mCustomScrollBox.bind("mousewheel." + namespace, function (e, delta) {
                        _onMousewheel(e, delta);
                    });
                    function _onMousewheel(e, delta) {
                        _stop($this);
                        if (_disableMousewheel($this, e.target)) {
                            return;
                        } /* disables mouse-wheel when hovering specific elements */
                        var deltaFactor = o.mouseWheel.deltaFactor !== "auto" ? parseInt(o.mouseWheel.deltaFactor) : (oldIE && e.deltaFactor < 100) ? 100 : e.deltaFactor || 100;
                        if (o.axis === "x" || o.mouseWheel.axis === "x") {
                            var dir = "x",
                                    px = [Math.round(deltaFactor * d.scrollRatio.x), parseInt(o.mouseWheel.scrollAmount)],
                                    amount = o.mouseWheel.scrollAmount !== "auto" ? px[1] : px[0] >= mCustomScrollBox.width() ? mCustomScrollBox.width() * 0.9 : px[0],
                                    contentPos = Math.abs($("#mCSB_" + d.idx + "_container")[0].offsetLeft),
                                    draggerPos = mCSB_dragger[1][0].offsetLeft,
                                    limit = mCSB_dragger[1].parent().width() - mCSB_dragger[1].width(),
                                    dlt = e.deltaX || e.deltaY || delta;
                        } else {
                            var dir = "y",
                                    px = [Math.round(deltaFactor * d.scrollRatio.y), parseInt(o.mouseWheel.scrollAmount)],
                                    amount = o.mouseWheel.scrollAmount !== "auto" ? px[1] : px[0] >= mCustomScrollBox.height() ? mCustomScrollBox.height() * 0.9 : px[0],
                                    contentPos = Math.abs($("#mCSB_" + d.idx + "_container")[0].offsetTop),
                                    draggerPos = mCSB_dragger[0][0].offsetTop,
                                    limit = mCSB_dragger[0].parent().height() - mCSB_dragger[0].height(),
                                    dlt = e.deltaY || delta;
                        }
                        if ((dir === "y" && !d.overflowed[0]) || (dir === "x" && !d.overflowed[1])) {
                            return;
                        }
                        if (o.mouseWheel.invert || e.webkitDirectionInvertedFromDevice) {
                            dlt = -dlt;
                        }
                        if (o.mouseWheel.normalizeDelta) {
                            dlt = dlt < 0 ? -1 : 1;
                        }
                        if ((dlt > 0 && draggerPos !== 0) || (dlt < 0 && draggerPos !== limit) || o.mouseWheel.preventDefault) {
                            e.stopImmediatePropagation();
                            e.preventDefault();
                        }
                        _scrollTo($this, (contentPos - (dlt * amount)).toString(), {dir: dir});
                    }
                },
                /* -------------------- */


                /* checks if iframe can be accessed */
                _canAccessIFrame = function (iframe) {
                    var html = null;
                    try {
                        var doc = iframe.contentDocument || iframe.contentWindow.document;
                        html = doc.body.innerHTML;
                    } catch (err) {/* do nothing */
                    }
                    return(html !== null);
                },
                /* -------------------- */


                /* disables mouse-wheel when hovering specific elements like select, datalist etc. */
                _disableMousewheel = function (el, target) {
                    var tag = target.nodeName.toLowerCase(),
                            tags = el.data(pluginPfx).opt.mouseWheel.disableOver,
                            /* elements that require focus */
                            focusTags = ["select", "textarea"];
                    return $.inArray(tag, tags) > -1 && !($.inArray(tag, focusTags) > -1 && !$(target).is(":focus"));
                },
                /* -------------------- */


                /*
                 DRAGGER RAIL CLICK EVENT
                 scrolls content via dragger rail
                 */
                _draggerRail = function () {
                    var $this = $(this), d = $this.data(pluginPfx),
                            namespace = pluginPfx + "_" + d.idx,
                            mCSB_container = $("#mCSB_" + d.idx + "_container"),
                            wrapper = mCSB_container.parent(),
                            mCSB_draggerContainer = $(".mCSB_" + d.idx + "_scrollbar ." + classes[12]);
                    mCSB_draggerContainer.bind("touchstart." + namespace + " pointerdown." + namespace + " MSPointerDown." + namespace, function (e) {
                        touchActive = true;
                    }).bind("touchend." + namespace + " pointerup." + namespace + " MSPointerUp." + namespace, function (e) {
                        touchActive = false;
                    }).bind("click." + namespace, function (e) {
                        if ($(e.target).hasClass(classes[12]) || $(e.target).hasClass("mCSB_draggerRail")) {
                            _stop($this);
                            var el = $(this), mCSB_dragger = el.find(".mCSB_dragger");
                            if (el.parent(".mCSB_scrollTools_horizontal").length > 0) {
                                if (!d.overflowed[1]) {
                                    return;
                                }
                                var dir = "x",
                                        clickDir = e.pageX > mCSB_dragger.offset().left ? -1 : 1,
                                        to = Math.abs(mCSB_container[0].offsetLeft) - (clickDir * (wrapper.width() * 0.9));
                            } else {
                                if (!d.overflowed[0]) {
                                    return;
                                }
                                var dir = "y",
                                        clickDir = e.pageY > mCSB_dragger.offset().top ? -1 : 1,
                                        to = Math.abs(mCSB_container[0].offsetTop) - (clickDir * (wrapper.height() * 0.9));
                            }
                            _scrollTo($this, to.toString(), {dir: dir, scrollEasing: "mcsEaseInOut"});
                        }
                    });
                },
                /* -------------------- */


                /*
                 FOCUS EVENT
                 scrolls content via element focus (e.g. clicking an input, pressing TAB key etc.)
                 */
                _focus = function () {
                    var $this = $(this), d = $this.data(pluginPfx), o = d.opt,
                            namespace = pluginPfx + "_" + d.idx,
                            mCSB_container = $("#mCSB_" + d.idx + "_container"),
                            wrapper = mCSB_container.parent();
                    mCSB_container.bind("focusin." + namespace, function (e) {
                        var el = $(document.activeElement),
                                nested = mCSB_container.find(".mCustomScrollBox").length,
                                dur = 0;
                        if (!el.is(o.advanced.autoScrollOnFocus)) {
                            return;
                        }
                        _stop($this);
                        clearTimeout($this[0]._focusTimeout);
                        $this[0]._focusTimer = nested ? (dur + 17) * nested : 0;
                        $this[0]._focusTimeout = setTimeout(function () {
                            var to = [_childPos(el)[0], _childPos(el)[1]],
                                    contentPos = [mCSB_container[0].offsetTop, mCSB_container[0].offsetLeft],
                                    isVisible = [
                                        (contentPos[0] + to[0] >= 0 && contentPos[0] + to[0] < wrapper.height() - el.outerHeight(false)),
                                        (contentPos[1] + to[1] >= 0 && contentPos[0] + to[1] < wrapper.width() - el.outerWidth(false))
                                    ],
                                    overwrite = (o.axis === "yx" && !isVisible[0] && !isVisible[1]) ? "none" : "all";
                            if (o.axis !== "x" && !isVisible[0]) {
                                _scrollTo($this, to[0].toString(), {dir: "y", scrollEasing: "mcsEaseInOut", overwrite: overwrite, dur: dur});
                            }
                            if (o.axis !== "y" && !isVisible[1]) {
                                _scrollTo($this, to[1].toString(), {dir: "x", scrollEasing: "mcsEaseInOut", overwrite: overwrite, dur: dur});
                            }
                        }, $this[0]._focusTimer);
                    });
                },
                /* -------------------- */


                /* sets content wrapper scrollTop/scrollLeft always to 0 */
                _wrapperScroll = function () {
                    var $this = $(this), d = $this.data(pluginPfx),
                            namespace = pluginPfx + "_" + d.idx,
                            wrapper = $("#mCSB_" + d.idx + "_container").parent();
                    wrapper.bind("scroll." + namespace, function (e) {
                        if (wrapper.scrollTop() !== 0 || wrapper.scrollLeft() !== 0) {
                            $(".mCSB_" + d.idx + "_scrollbar").css("visibility", "hidden"); /* hide scrollbar(s) */
                        }
                    });
                },
                /* -------------------- */


                /*
                 BUTTONS EVENTS
                 scrolls content via up, down, left and right buttons
                 */
                _buttons = function () {
                    var $this = $(this), d = $this.data(pluginPfx), o = d.opt, seq = d.sequential,
                            namespace = pluginPfx + "_" + d.idx,
                            sel = ".mCSB_" + d.idx + "_scrollbar",
                            btn = $(sel + ">a");
                    btn.bind("mousedown." + namespace + " touchstart." + namespace + " pointerdown." + namespace + " MSPointerDown." + namespace + " mouseup." + namespace + " touchend." + namespace + " pointerup." + namespace + " MSPointerUp." + namespace + " mouseout." + namespace + " pointerout." + namespace + " MSPointerOut." + namespace + " click." + namespace, function (e) {
                        e.preventDefault();
                        if (!_mouseBtnLeft(e)) {
                            return;
                        } /* left mouse button only */
                        var btnClass = $(this).attr("class");
                        seq.type = o.scrollButtons.scrollType;
                        switch (e.type) {
                            case "mousedown":
                            case "touchstart":
                            case "pointerdown":
                            case "MSPointerDown":
                                if (seq.type === "stepped") {
                                    return;
                                }
                                touchActive = true;
                                d.tweenRunning = false;
                                _seq("on", btnClass);
                                break;
                            case "mouseup":
                            case "touchend":
                            case "pointerup":
                            case "MSPointerUp":
                            case "mouseout":
                            case "pointerout":
                            case "MSPointerOut":
                                if (seq.type === "stepped") {
                                    return;
                                }
                                touchActive = false;
                                if (seq.dir) {
                                    _seq("off", btnClass);
                                }
                                break;
                            case "click":
                                if (seq.type !== "stepped" || d.tweenRunning) {
                                    return;
                                }
                                _seq("on", btnClass);
                                break;
                        }
                        function _seq(a, c) {
                            seq.scrollAmount = o.snapAmount || o.scrollButtons.scrollAmount;
                            _sequentialScroll($this, a, c);
                        }
                    });
                },
                /* -------------------- */


                /*
                 KEYBOARD EVENTS
                 scrolls content via keyboard
                 Keys: up arrow, down arrow, left arrow, right arrow, PgUp, PgDn, Home, End
                 */
                _keyboard = function () {
                    var $this = $(this), d = $this.data(pluginPfx), o = d.opt, seq = d.sequential,
                            namespace = pluginPfx + "_" + d.idx,
                            mCustomScrollBox = $("#mCSB_" + d.idx),
                            mCSB_container = $("#mCSB_" + d.idx + "_container"),
                            wrapper = mCSB_container.parent(),
                            editables = "input,textarea,select,datalist,keygen,[contenteditable='true']",
                            iframe = mCSB_container.find("iframe"),
                            events = ["blur." + namespace + " keydown." + namespace + " keyup." + namespace];
                    if (iframe.length) {
                        iframe.each(function () {
                            $(this).load(function () {
                                /* bind events on accessible iframes */
                                if (_canAccessIFrame(this)) {
                                    $(this.contentDocument || this.contentWindow.document).bind(events[0], function (e) {
                                        _onKeyboard(e);
                                    });
                                }
                            });
                        });
                    }
                    mCustomScrollBox.attr("tabindex", "0").bind(events[0], function (e) {
                        _onKeyboard(e);
                    });
                    function _onKeyboard(e) {
                        switch (e.type) {
                            case "blur":
                                if (d.tweenRunning && seq.dir) {
                                    _seq("off", null);
                                }
                                break;
                            case "keydown":
                            case "keyup":
                                var code = e.keyCode ? e.keyCode : e.which, action = "on";
                                if ((o.axis !== "x" && (code === 38 || code === 40)) || (o.axis !== "y" && (code === 37 || code === 39))) {
                                    /* up (38), down (40), left (37), right (39) arrows */
                                    if (((code === 38 || code === 40) && !d.overflowed[0]) || ((code === 37 || code === 39) && !d.overflowed[1])) {
                                        return;
                                    }
                                    if (e.type === "keyup") {
                                        action = "off";
                                    }
                                    if (!$(document.activeElement).is(editables)) {
                                        e.preventDefault();
                                        e.stopImmediatePropagation();
                                        _seq(action, code);
                                    }
                                } else if (code === 33 || code === 34) {
                                    /* PgUp (33), PgDn (34) */
                                    if (d.overflowed[0] || d.overflowed[1]) {
                                        e.preventDefault();
                                        e.stopImmediatePropagation();
                                    }
                                    if (e.type === "keyup") {
                                        _stop($this);
                                        var keyboardDir = code === 34 ? -1 : 1;
                                        if (o.axis === "x" || (o.axis === "yx" && d.overflowed[1] && !d.overflowed[0])) {
                                            var dir = "x", to = Math.abs(mCSB_container[0].offsetLeft) - (keyboardDir * (wrapper.width() * 0.9));
                                        } else {
                                            var dir = "y", to = Math.abs(mCSB_container[0].offsetTop) - (keyboardDir * (wrapper.height() * 0.9));
                                        }
                                        _scrollTo($this, to.toString(), {dir: dir, scrollEasing: "mcsEaseInOut"});
                                    }
                                } else if (code === 35 || code === 36) {
                                    /* End (35), Home (36) */
                                    if (!$(document.activeElement).is(editables)) {
                                        if (d.overflowed[0] || d.overflowed[1]) {
                                            e.preventDefault();
                                            e.stopImmediatePropagation();
                                        }
                                        if (e.type === "keyup") {
                                            if (o.axis === "x" || (o.axis === "yx" && d.overflowed[1] && !d.overflowed[0])) {
                                                var dir = "x", to = code === 35 ? Math.abs(wrapper.width() - mCSB_container.outerWidth(false)) : 0;
                                            } else {
                                                var dir = "y", to = code === 35 ? Math.abs(wrapper.height() - mCSB_container.outerHeight(false)) : 0;
                                            }
                                            _scrollTo($this, to.toString(), {dir: dir, scrollEasing: "mcsEaseInOut"});
                                        }
                                    }
                                }
                                break;
                        }
                        function _seq(a, c) {
                            seq.type = o.keyboard.scrollType;
                            seq.scrollAmount = o.snapAmount || o.keyboard.scrollAmount;
                            if (seq.type === "stepped" && d.tweenRunning) {
                                return;
                            }
                            _sequentialScroll($this, a, c);
                        }
                    }
                },
                /* -------------------- */


                /* scrolls content sequentially (used when scrolling via buttons, keyboard arrows etc.) */
                _sequentialScroll = function (el, action, trigger, e, s) {
                    var d = el.data(pluginPfx), o = d.opt, seq = d.sequential,
                            mCSB_container = $("#mCSB_" + d.idx + "_container"),
                            once = seq.type === "stepped" ? true : false,
                            steplessSpeed = o.scrollInertia < 26 ? 26 : o.scrollInertia, /* 26/1.5=17 */
                            steppedSpeed = o.scrollInertia < 1 ? 17 : o.scrollInertia;
                    switch (action) {
                        case "on":
                            seq.dir = [
                                (trigger === classes[16] || trigger === classes[15] || trigger === 39 || trigger === 37 ? "x" : "y"),
                                (trigger === classes[13] || trigger === classes[15] || trigger === 38 || trigger === 37 ? -1 : 1)
                            ];
                            _stop(el);
                            if (_isNumeric(trigger) && seq.type === "stepped") {
                                return;
                            }
                            _on(once);
                            break;
                        case "off":
                            _off();
                            if (once || (d.tweenRunning && seq.dir)) {
                                _on(true);
                            }
                            break;
                    }
                    /* starts sequence */
                    function _on(once) {
                        var c = seq.type !== "stepped", /* continuous scrolling */
                                t = s ? s : !once ? 1000 / 60 : c ? steplessSpeed / 1.5 : steppedSpeed, /* timer */
                                m = !once ? 2.5 : c ? 7.5 : 40, /* multiplier */
                                contentPos = [Math.abs(mCSB_container[0].offsetTop), Math.abs(mCSB_container[0].offsetLeft)],
                                ratio = [d.scrollRatio.y > 10 ? 10 : d.scrollRatio.y, d.scrollRatio.x > 10 ? 10 : d.scrollRatio.x],
                                amount = seq.dir[0] === "x" ? contentPos[1] + (seq.dir[1] * (ratio[1] * m)) : contentPos[0] + (seq.dir[1] * (ratio[0] * m)),
                                px = seq.dir[0] === "x" ? contentPos[1] + (seq.dir[1] * parseInt(seq.scrollAmount)) : contentPos[0] + (seq.dir[1] * parseInt(seq.scrollAmount)),
                                to = seq.scrollAmount !== "auto" ? px : amount,
                                easing = e ? e : !once ? "mcsLinear" : c ? "mcsLinearOut" : "mcsEaseInOut",
                                onComplete = !once ? false : true;
                        if (once && t < 17) {
                            to = seq.dir[0] === "x" ? contentPos[1] : contentPos[0];
                        }
                        _scrollTo(el, to.toString(), {dir: seq.dir[0], scrollEasing: easing, dur: t, onComplete: onComplete});
                        if (once) {
                            seq.dir = false;
                            return;
                        }
                        clearTimeout(seq.step);
                        seq.step = setTimeout(function () {
                            _on();
                        }, t);
                    }
                    /* stops sequence */
                    function _off() {
                        clearTimeout(seq.step);
                        _delete(seq, "step");
                        _stop(el);
                    }
                },
                /* -------------------- */


                /* returns a yx array from value */
                _arr = function (val) {
                    var o = $(this).data(pluginPfx).opt, vals = [];
                    if (typeof val === "function") {
                        val = val();
                    } /* check if the value is a single anonymous function */
                    /* check if value is object or array, its length and create an array with yx values */
                    if (!(val instanceof Array)) { /* object value (e.g. {y:"100",x:"100"}, 100 etc.) */
                        vals[0] = val.y ? val.y : val.x || o.axis === "x" ? null : val;
                        vals[1] = val.x ? val.x : val.y || o.axis === "y" ? null : val;
                    } else { /* array value (e.g. [100,100]) */
                        vals = val.length > 1 ? [val[0], val[1]] : o.axis === "x" ? [null, val[0]] : [val[0], null];
                    }
                    /* check if array values are anonymous functions */
                    if (typeof vals[0] === "function") {
                        vals[0] = vals[0]();
                    }
                    if (typeof vals[1] === "function") {
                        vals[1] = vals[1]();
                    }
                    return vals;
                },
                /* -------------------- */


                /* translates values (e.g. "top", 100, "100px", "#id") to actual scroll-to positions */
                _to = function (val, dir) {
                    if (val == null || typeof val == "undefined") {
                        return;
                    }
                    var $this = $(this), d = $this.data(pluginPfx), o = d.opt,
                            mCSB_container = $("#mCSB_" + d.idx + "_container"),
                            wrapper = mCSB_container.parent(),
                            t = typeof val;
                    if (!dir) {
                        dir = o.axis === "x" ? "x" : "y";
                    }
                    var contentLength = dir === "x" ? mCSB_container.outerWidth(false) : mCSB_container.outerHeight(false),
                            contentPos = dir === "x" ? mCSB_container[0].offsetLeft : mCSB_container[0].offsetTop,
                            cssProp = dir === "x" ? "left" : "top";
                    switch (t) {
                        case "function": /* this currently is not used. Consider removing it */
                            return val();
                            break;
                        case "object": /* js/jquery object */
                            var obj = val.jquery ? val : $(val);
                            if (!obj.length) {
                                return;
                            }
                            return dir === "x" ? _childPos(obj)[1] : _childPos(obj)[0];
                            break;
                        case "string":
                        case "number":
                            if (_isNumeric(val)) { /* numeric value */
                                return Math.abs(val);
                            } else if (val.indexOf("%") !== -1) { /* percentage value */
                                return Math.abs(contentLength * parseInt(val) / 100);
                            } else if (val.indexOf("-=") !== -1) { /* decrease value */
                                return Math.abs(contentPos - parseInt(val.split("-=")[1]));
                            } else if (val.indexOf("+=") !== -1) { /* inrease value */
                                var p = (contentPos + parseInt(val.split("+=")[1]));
                                return p >= 0 ? 0 : Math.abs(p);
                            } else if (val.indexOf("px") !== -1 && _isNumeric(val.split("px")[0])) { /* pixels string value (e.g. "100px") */
                                return Math.abs(val.split("px")[0]);
                            } else {
                                if (val === "top" || val === "left") { /* special strings */
                                    return 0;
                                } else if (val === "bottom") {
                                    return Math.abs(wrapper.height() - mCSB_container.outerHeight(false));
                                } else if (val === "right") {
                                    return Math.abs(wrapper.width() - mCSB_container.outerWidth(false));
                                } else if (val === "first" || val === "last") {
                                    var obj = mCSB_container.find(":" + val);
                                    return dir === "x" ? _childPos(obj)[1] : _childPos(obj)[0];
                                } else {
                                    if ($(val).length) { /* jquery selector */
                                        return dir === "x" ? _childPos($(val))[1] : _childPos($(val))[0];
                                    } else { /* other values (e.g. "100em") */
                                        mCSB_container.css(cssProp, val);
                                        methods.update.call(null, $this[0]);
                                        return;
                                    }
                                }
                            }
                            break;
                    }
                },
                /* -------------------- */


                /* calls the update method automatically */
                _autoUpdate = function (rem) {
                    var $this = $(this), d = $this.data(pluginPfx), o = d.opt,
                            mCSB_container = $("#mCSB_" + d.idx + "_container");
                    if (rem) {
                        /*
                         removes autoUpdate timer
                         usage: _autoUpdate.call(this,"remove");
                         */
                        clearTimeout(mCSB_container[0].autoUpdate);
                        _delete(mCSB_container[0], "autoUpdate");
                        return;
                    }
                    var wrapper = mCSB_container.parent(),
                            scrollbar = [$("#mCSB_" + d.idx + "_scrollbar_vertical"), $("#mCSB_" + d.idx + "_scrollbar_horizontal")],
                            scrollbarSize = function () {
                                return [
                                    scrollbar[0].is(":visible") ? scrollbar[0].outerHeight(true) : 0, /* returns y-scrollbar height */
                                    scrollbar[1].is(":visible") ? scrollbar[1].outerWidth(true) : 0 /* returns x-scrollbar width */
                                ]
                            },
                            oldSelSize = sizesSum(), newSelSize,
                            os = [mCSB_container.outerHeight(false), mCSB_container.outerWidth(false), wrapper.height(), wrapper.width(), scrollbarSize()[0], scrollbarSize()[1]], ns,
                            oldImgsLen = imgSum(), newImgsLen;
                    upd();
                    function upd() {
                        clearTimeout(mCSB_container[0].autoUpdate);
                        if ($this.parents("html").length === 0) {
                            /* check element in dom tree */
                            $this = null;
                            return;
                        }
                        mCSB_container[0].autoUpdate = setTimeout(function () {
                            /* update on specific selector(s) length and size change */
                            if (o.advanced.updateOnSelectorChange) {
                                newSelSize = sizesSum();
                                if (newSelSize !== oldSelSize) {
                                    doUpd(3);
                                    oldSelSize = newSelSize;
                                    return;
                                }
                            }
                            /* update on main element and scrollbar size changes */
                            if (o.advanced.updateOnContentResize) {
                                ns = [mCSB_container.outerHeight(false), mCSB_container.outerWidth(false), wrapper.height(), wrapper.width(), scrollbarSize()[0], scrollbarSize()[1]];
                                if (ns[0] !== os[0] || ns[1] !== os[1] || ns[2] !== os[2] || ns[3] !== os[3] || ns[4] !== os[4] || ns[5] !== os[5]) {
                                    doUpd(ns[0] !== os[0] || ns[1] !== os[1]);
                                    os = ns;
                                }
                            }
                            /* update on image load */
                            if (o.advanced.updateOnImageLoad) {
                                newImgsLen = imgSum();
                                if (newImgsLen !== oldImgsLen) {
                                    mCSB_container.find("img").each(function () {
                                        imgLoader(this);
                                    });
                                    oldImgsLen = newImgsLen;
                                }
                            }
                            if (o.advanced.updateOnSelectorChange || o.advanced.updateOnContentResize || o.advanced.updateOnImageLoad) {
                                upd();
                            }
                        }, o.advanced.autoUpdateTimeout);
                    }
                    /* returns images amount */
                    function imgSum() {
                        var total = 0
                        if (o.advanced.updateOnImageLoad) {
                            total = mCSB_container.find("img").length;
                        }
                        return total;
                    }
                    /* a tiny image loader */
                    function imgLoader(el) {
                        if ($(el).hasClass(classes[2])) {
                            doUpd();
                            return;
                        }
                        var img = new Image();
                        function createDelegate(contextObject, delegateMethod) {
                            return function () {
                                return delegateMethod.apply(contextObject, arguments);
                            }
                        }
                        function imgOnLoad() {
                            this.onload = null;
                            $(el).addClass(classes[2]);
                            doUpd(2);
                        }
                        img.onload = createDelegate(img, imgOnLoad);
                        img.src = el.src;
                    }
                    /* returns the total height and width sum of all elements matching the selector */
                    function sizesSum() {
                        if (o.advanced.updateOnSelectorChange === true) {
                            o.advanced.updateOnSelectorChange = "*";
                        }
                        var total = 0, sel = mCSB_container.find(o.advanced.updateOnSelectorChange);
                        if (o.advanced.updateOnSelectorChange && sel.length > 0) {
                            sel.each(function () {
                                total += $(this).height() + $(this).width();
                            });
                        }
                        return total;
                    }
                    /* calls the update method */
                    function doUpd(cb) {
                        clearTimeout(mCSB_container[0].autoUpdate);
                        methods.update.call(null, $this[0], cb);
                    }
                },
                /* -------------------- */


                /* snaps scrolling to a multiple of a pixels number */
                _snapAmount = function (to, amount, offset) {
                    return (Math.round(to / amount) * amount - offset);
                },
                /* -------------------- */


                /* stops content and scrollbar animations */
                _stop = function (el) {
                    var d = el.data(pluginPfx),
                            sel = $("#mCSB_" + d.idx + "_container,#mCSB_" + d.idx + "_container_wrapper,#mCSB_" + d.idx + "_dragger_vertical,#mCSB_" + d.idx + "_dragger_horizontal");
                    sel.each(function () {
                        _stopTween.call(this);
                    });
                },
                /* -------------------- */


                /*
                 ANIMATES CONTENT
                 This is where the actual scrolling happens
                 */
                _scrollTo = function (el, to, options) {
                    var d = el.data(pluginPfx), o = d.opt,
                            defaults = {
                                trigger: "internal",
                                dir: "y",
                                scrollEasing: "mcsEaseOut",
                                drag: false,
                                dur: o.scrollInertia,
                                overwrite: "all",
                                callbacks: true,
                                onStart: true,
                                onUpdate: true,
                                onComplete: true
                            },
                    options = $.extend(defaults, options),
                            dur = [options.dur, (options.drag ? 0 : options.dur)],
                            mCustomScrollBox = $("#mCSB_" + d.idx),
                            mCSB_container = $("#mCSB_" + d.idx + "_container"),
                            wrapper = mCSB_container.parent(),
                            totalScrollOffsets = o.callbacks.onTotalScrollOffset ? _arr.call(el, o.callbacks.onTotalScrollOffset) : [0, 0],
                            totalScrollBackOffsets = o.callbacks.onTotalScrollBackOffset ? _arr.call(el, o.callbacks.onTotalScrollBackOffset) : [0, 0];
                    d.trigger = options.trigger;
                    if (wrapper.scrollTop() !== 0 || wrapper.scrollLeft() !== 0) { /* always reset scrollTop/Left */
                        $(".mCSB_" + d.idx + "_scrollbar").css("visibility", "visible");
                        wrapper.scrollTop(0).scrollLeft(0);
                    }
                    if (to === "_resetY" && !d.contentReset.y) {
                        /* callbacks: onOverflowYNone */
                        if (_cb("onOverflowYNone")) {
                            o.callbacks.onOverflowYNone.call(el[0]);
                        }
                        d.contentReset.y = 1;
                    }
                    if (to === "_resetX" && !d.contentReset.x) {
                        /* callbacks: onOverflowXNone */
                        if (_cb("onOverflowXNone")) {
                            o.callbacks.onOverflowXNone.call(el[0]);
                        }
                        d.contentReset.x = 1;
                    }
                    if (to === "_resetY" || to === "_resetX") {
                        return;
                    }
                    if ((d.contentReset.y || !el[0].mcs) && d.overflowed[0]) {
                        /* callbacks: onOverflowY */
                        if (_cb("onOverflowY")) {
                            o.callbacks.onOverflowY.call(el[0]);
                        }
                        d.contentReset.x = null;
                    }
                    if ((d.contentReset.x || !el[0].mcs) && d.overflowed[1]) {
                        /* callbacks: onOverflowX */
                        if (_cb("onOverflowX")) {
                            o.callbacks.onOverflowX.call(el[0]);
                        }
                        d.contentReset.x = null;
                    }
                    if (o.snapAmount) {
                        to = _snapAmount(to, o.snapAmount, o.snapOffset);
                    } /* scrolling snapping */
                    switch (options.dir) {
                        case "x":
                            var mCSB_dragger = $("#mCSB_" + d.idx + "_dragger_horizontal"),
                                    property = "left",
                                    contentPos = mCSB_container[0].offsetLeft,
                                    limit = [
                                        mCustomScrollBox.width() - mCSB_container.outerWidth(false),
                                        mCSB_dragger.parent().width() - mCSB_dragger.width()
                                    ],
                                    scrollTo = [to, to === 0 ? 0 : (to / d.scrollRatio.x)],
                                    tso = totalScrollOffsets[1],
                                    tsbo = totalScrollBackOffsets[1],
                                    totalScrollOffset = tso > 0 ? tso / d.scrollRatio.x : 0,
                                    totalScrollBackOffset = tsbo > 0 ? tsbo / d.scrollRatio.x : 0;
                            break;
                        case "y":
                            var mCSB_dragger = $("#mCSB_" + d.idx + "_dragger_vertical"),
                                    property = "top",
                                    contentPos = mCSB_container[0].offsetTop,
                                    limit = [
                                        mCustomScrollBox.height() - mCSB_container.outerHeight(false),
                                        mCSB_dragger.parent().height() - mCSB_dragger.height()
                                    ],
                                    scrollTo = [to, to === 0 ? 0 : (to / d.scrollRatio.y)],
                                    tso = totalScrollOffsets[0],
                                    tsbo = totalScrollBackOffsets[0],
                                    totalScrollOffset = tso > 0 ? tso / d.scrollRatio.y : 0,
                                    totalScrollBackOffset = tsbo > 0 ? tsbo / d.scrollRatio.y : 0;
                            break;
                    }
                    if (scrollTo[1] < 0 || (scrollTo[0] === 0 && scrollTo[1] === 0)) {
                        scrollTo = [0, 0];
                    } else if (scrollTo[1] >= limit[1]) {
                        scrollTo = [limit[0], limit[1]];
                    } else {
                        scrollTo[0] = -scrollTo[0];
                    }
                    if (!el[0].mcs) {
                        _mcs();  /* init mcs object (once) to make it available before callbacks */
                        if (_cb("onInit")) {
                            o.callbacks.onInit.call(el[0]);
                        } /* callbacks: onInit */
                    }
                    clearTimeout(mCSB_container[0].onCompleteTimeout);
                    if (!d.tweenRunning && ((contentPos === 0 && scrollTo[0] >= 0) || (contentPos === limit[0] && scrollTo[0] <= limit[0]))) {
                        return;
                    }
                    _tweenTo(mCSB_dragger[0], property, Math.round(scrollTo[1]), dur[1], options.scrollEasing);
                    _tweenTo(mCSB_container[0], property, Math.round(scrollTo[0]), dur[0], options.scrollEasing, options.overwrite, {
                        onStart: function () {
                            if (options.callbacks && options.onStart && !d.tweenRunning) {
                                /* callbacks: onScrollStart */
                                if (_cb("onScrollStart")) {
                                    _mcs();
                                    o.callbacks.onScrollStart.call(el[0]);
                                }
                                d.tweenRunning = true;
                                _onDragClasses(mCSB_dragger);
                                d.cbOffsets = _cbOffsets();
                            }
                        }, onUpdate: function () {
                            if (options.callbacks && options.onUpdate) {
                                /* callbacks: whileScrolling */
                                if (_cb("whileScrolling")) {
                                    _mcs();
                                    o.callbacks.whileScrolling.call(el[0]);
                                }
                            }
                        }, onComplete: function () {
                            if (options.callbacks && options.onComplete) {
                                if (o.axis === "yx") {
                                    clearTimeout(mCSB_container[0].onCompleteTimeout);
                                }
                                var t = mCSB_container[0].idleTimer || 0;
                                mCSB_container[0].onCompleteTimeout = setTimeout(function () {
                                    /* callbacks: onScroll, onTotalScroll, onTotalScrollBack */
                                    if (_cb("onScroll")) {
                                        _mcs();
                                        o.callbacks.onScroll.call(el[0]);
                                    }
                                    if (_cb("onTotalScroll") && scrollTo[1] >= limit[1] - totalScrollOffset && d.cbOffsets[0]) {
                                        _mcs();
                                        o.callbacks.onTotalScroll.call(el[0]);
                                    }
                                    if (_cb("onTotalScrollBack") && scrollTo[1] <= totalScrollBackOffset && d.cbOffsets[1]) {
                                        _mcs();
                                        o.callbacks.onTotalScrollBack.call(el[0]);
                                    }
                                    d.tweenRunning = false;
                                    mCSB_container[0].idleTimer = 0;
                                    _onDragClasses(mCSB_dragger, "hide");
                                }, t);
                            }
                        }
                    });
                    /* checks if callback function exists */
                    function _cb(cb) {
                        return d && o.callbacks[cb] && typeof o.callbacks[cb] === "function";
                    }
                    /* checks whether callback offsets always trigger */
                    function _cbOffsets() {
                        return [o.callbacks.alwaysTriggerOffsets || contentPos >= limit[0] + tso, o.callbacks.alwaysTriggerOffsets || contentPos <= -tsbo];
                    }
                    /*
                     populates object with useful values for the user
                     values:
                     content: this.mcs.content
                     content top position: this.mcs.top
                     content left position: this.mcs.left
                     dragger top position: this.mcs.draggerTop
                     dragger left position: this.mcs.draggerLeft
                     scrolling y percentage: this.mcs.topPct
                     scrolling x percentage: this.mcs.leftPct
                     scrolling direction: this.mcs.direction
                     */
                    function _mcs() {
                        var cp = [mCSB_container[0].offsetTop, mCSB_container[0].offsetLeft], /* content position */
                                dp = [mCSB_dragger[0].offsetTop, mCSB_dragger[0].offsetLeft], /* dragger position */
                                cl = [mCSB_container.outerHeight(false), mCSB_container.outerWidth(false)], /* content length */
                                pl = [mCustomScrollBox.height(), mCustomScrollBox.width()]; /* content parent length */
                        el[0].mcs = {
                            content: mCSB_container, /* original content wrapper as jquery object */
                            top: cp[0], left: cp[1], draggerTop: dp[0], draggerLeft: dp[1],
                            topPct: Math.round((100 * Math.abs(cp[0])) / (Math.abs(cl[0]) - pl[0])), leftPct: Math.round((100 * Math.abs(cp[1])) / (Math.abs(cl[1]) - pl[1])),
                            direction: options.dir
                        };
                        /*
                         this refers to the original element containing the scrollbar(s)
                         usage: this.mcs.top, this.mcs.leftPct etc.
                         */
                    }
                },
                /* -------------------- */


                /*
                 CUSTOM JAVASCRIPT ANIMATION TWEEN
                 Lighter and faster than jquery animate() and css transitions
                 Animates top/left properties and includes easings
                 */
                _tweenTo = function (el, prop, to, duration, easing, overwrite, callbacks) {
                    if (!el._mTween) {
                        el._mTween = {top: {}, left: {}};
                    }
                    var callbacks = callbacks || {},
                            onStart = callbacks.onStart || function () {
                            }, onUpdate = callbacks.onUpdate || function () {
                    }, onComplete = callbacks.onComplete || function () {
                    },
                            startTime = _getTime(), _delay, progress = 0, from = el.offsetTop, elStyle = el.style, _request, tobj = el._mTween[prop];
                    if (prop === "left") {
                        from = el.offsetLeft;
                    }
                    var diff = to - from;
                    tobj.stop = 0;
                    if (overwrite !== "none") {
                        _cancelTween();
                    }
                    _startTween();
                    function _step() {
                        if (tobj.stop) {
                            return;
                        }
                        if (!progress) {
                            onStart.call();
                        }
                        progress = _getTime() - startTime;
                        _tween();
                        if (progress >= tobj.time) {
                            tobj.time = (progress > tobj.time) ? progress + _delay - (progress - tobj.time) : progress + _delay - 1;
                            if (tobj.time < progress + 1) {
                                tobj.time = progress + 1;
                            }
                        }
                        if (tobj.time < duration) {
                            tobj.id = _request(_step);
                        } else {
                            onComplete.call();
                        }
                    }
                    function _tween() {
                        if (duration > 0) {
                            tobj.currVal = _ease(tobj.time, from, diff, duration, easing);
                            elStyle[prop] = Math.round(tobj.currVal) + "px";
                        } else {
                            elStyle[prop] = to + "px";
                        }
                        onUpdate.call();
                    }
                    function _startTween() {
                        _delay = 1000 / 60;
                        tobj.time = progress + _delay;
                        _request = (!window.requestAnimationFrame) ? function (f) {
                            _tween();
                            return setTimeout(f, 0.01);
                        } : window.requestAnimationFrame;
                        tobj.id = _request(_step);
                    }
                    function _cancelTween() {
                        if (tobj.id == null) {
                            return;
                        }
                        if (!window.requestAnimationFrame) {
                            clearTimeout(tobj.id);
                        } else {
                            window.cancelAnimationFrame(tobj.id);
                        }
                        tobj.id = null;
                    }
                    function _ease(t, b, c, d, type) {
                        switch (type) {
                            case "linear":
                            case "mcsLinear":
                                return c * t / d + b;
                                break;
                            case "mcsLinearOut":
                                t /= d;
                                t--;
                                return c * Math.sqrt(1 - t * t) + b;
                                break;
                            case "easeInOutSmooth":
                                t /= d / 2;
                                if (t < 1)
                                    return c / 2 * t * t + b;
                                t--;
                                return -c / 2 * (t * (t - 2) - 1) + b;
                                break;
                            case "easeInOutStrong":
                                t /= d / 2;
                                if (t < 1)
                                    return c / 2 * Math.pow(2, 10 * (t - 1)) + b;
                                t--;
                                return c / 2 * (-Math.pow(2, -10 * t) + 2) + b;
                                break;
                            case "easeInOut":
                            case "mcsEaseInOut":
                                t /= d / 2;
                                if (t < 1)
                                    return c / 2 * t * t * t + b;
                                t -= 2;
                                return c / 2 * (t * t * t + 2) + b;
                                break;
                            case "easeOutSmooth":
                                t /= d;
                                t--;
                                return -c * (t * t * t * t - 1) + b;
                                break;
                            case "easeOutStrong":
                                return c * (-Math.pow(2, -10 * t / d) + 1) + b;
                                break;
                            case "easeOut":
                            case "mcsEaseOut":
                            default:
                                var ts = (t /= d) * t, tc = ts * t;
                                return b + c * (0.499999999999997 * tc * ts + -2.5 * ts * ts + 5.5 * tc + -6.5 * ts + 4 * t);
                        }
                    }
                },
                /* -------------------- */


                /* returns current time */
                _getTime = function () {
                    if (window.performance && window.performance.now) {
                        return window.performance.now();
                    } else {
                        if (window.performance && window.performance.webkitNow) {
                            return window.performance.webkitNow();
                        } else {
                            if (Date.now) {
                                return Date.now();
                            } else {
                                return new Date().getTime();
                            }
                        }
                    }
                },
                /* -------------------- */


                /* stops a tween */
                _stopTween = function () {
                    var el = this;
                    if (!el._mTween) {
                        el._mTween = {top: {}, left: {}};
                    }
                    var props = ["top", "left"];
                    for (var i = 0; i < props.length; i++) {
                        var prop = props[i];
                        if (el._mTween[prop].id) {
                            if (!window.requestAnimationFrame) {
                                clearTimeout(el._mTween[prop].id);
                            } else {
                                window.cancelAnimationFrame(el._mTween[prop].id);
                            }
                            el._mTween[prop].id = null;
                            el._mTween[prop].stop = 1;
                        }
                    }
                },
                /* -------------------- */


                /* deletes a property (avoiding the exception thrown by IE) */
                _delete = function (c, m) {
                    try {
                        delete c[m];
                    } catch (e) {
                        c[m] = null;
                    }
                },
                /* -------------------- */


                /* detects left mouse button */
                _mouseBtnLeft = function (e) {
                    return !(e.which && e.which !== 1);
                },
                /* -------------------- */


                /* detects if pointer type event is touch */
                _pointerTouch = function (e) {
                    var t = e.originalEvent.pointerType;
                    return !(t && t !== "touch" && t !== 2);
                },
                /* -------------------- */


                /* checks if value is numeric */
                _isNumeric = function (val) {
                    return !isNaN(parseFloat(val)) && isFinite(val);
                },
                /* -------------------- */


                /* returns element position according to content */
                _childPos = function (el) {
                    var p = el.parents(".mCSB_container");
                    return [el.offset().top - p.offset().top, el.offset().left - p.offset().left];
                };
        /* -------------------- */





        /*
         ----------------------------------------
         PLUGIN SETUP
         ----------------------------------------
         */

        /* plugin constructor functions */
        $.fn[pluginNS] = function (method) { /* usage: $(selector).mCustomScrollbar(); */
            if (methods[method]) {
                return methods[method].apply(this, Array.prototype.slice.call(arguments, 1));
            } else if (typeof method === "object" || !method) {
                return methods.init.apply(this, arguments);
            } else {
                $.error("Method " + method + " does not exist");
            }
        };
        $[pluginNS] = function (method) { /* usage: $.mCustomScrollbar(); */
            if (methods[method]) {
                return methods[method].apply(this, Array.prototype.slice.call(arguments, 1));
            } else if (typeof method === "object" || !method) {
                return methods.init.apply(this, arguments);
            } else {
                $.error("Method " + method + " does not exist");
            }
        };

        /*
         allow setting plugin default options.
         usage: $.mCustomScrollbar.defaults.scrollInertia=500;
         to apply any changed default options on default selectors (below), use inside document ready fn
         e.g.: $(document).ready(function(){ $.mCustomScrollbar.defaults.scrollInertia=500; });
         */
        $[pluginNS].defaults = defaults;

        /*
         add window object (window.mCustomScrollbar)
         usage: if(window.mCustomScrollbar){console.log("custom scrollbar plugin loaded");}
         */
        window[pluginNS] = true;

        $(window).load(function () {

            $(defaultSelector)[pluginNS](); /* add scrollbars automatically on default selector */

            /* extend jQuery expressions */
            $.extend($.expr[":"], {
                /* checks if element is within scrollable viewport */
                mcsInView: $.expr[":"].mcsInView || function (el) {
                    var $el = $(el), content = $el.parents(".mCSB_container"), wrapper, cPos;
                    if (!content.length) {
                        return;
                    }
                    wrapper = content.parent();
                    cPos = [content[0].offsetTop, content[0].offsetLeft];
                    return 	cPos[0] + _childPos($el)[0] >= 0 && cPos[0] + _childPos($el)[0] < wrapper.height() - $el.outerHeight(false) &&
                            cPos[1] + _childPos($el)[1] >= 0 && cPos[1] + _childPos($el)[1] < wrapper.width() - $el.outerWidth(false);
                },
                /* checks if element is overflowed having visible scrollbar(s) */
                mcsOverflow: $.expr[":"].mcsOverflow || function (el) {
                    var d = $(el).data(pluginPfx);
                    if (!d) {
                        return;
                    }
                    return d.overflowed[0] || d.overflowed[1];
                }
            });

        });

    }))
}));
/**
 * jQuery Bar Rating Plugin v1.1.1
 *
 * http://github.com/antennaio/jquery-bar-rating
 *
 * Copyright (c) 2012-2015 Kazik Pietruszewski
 *
 * Dual licensed under the MIT and GPL licenses:
 * http://www.opensource.org/licenses/mit-license.php
 * http://www.gnu.org/licenses/gpl.html
 */
(function ($) {
    var BarRating, root;

    root = typeof window !== "undefined" && window !== null ? window : global;

    root.BarRating = BarRating = (function () {

        function BarRating() {
            var self = this;

            // wrap element in a wrapper div
            var wrapElement = function () {
                var classes = [self.options.wrapperClass];

                if (self.options.theme !== '') {
                    classes.push('br-theme-' + self.options.theme);
                }

                self.$elem.wrap($('<div />', {
                    'class': classes.join(' ')
                }));
            };

            // unwrap element
            var unwrapElement = function () {
                self.$elem.unwrap();
            };

            // return initial option
            var findInitialOption = function () {
                var option;

                if (self.options.initialRating) {
                    option = $('option[value="' + self.options.initialRating + '"]', self.$elem);
                } else {
                    option = $('option:selected', self.$elem);
                }

                return option;
            };

            // save data on element
            var saveDataOnElement = function () {
                var $opt = findInitialOption();

                self.$elem.data('barrating', {
                    userOptions: self.options,
                    // initial rating based on the OPTION value
                    currentRatingValue: $opt.val(),
                    currentRatingText: ($opt.data('html')) ? $opt.data('html') : $opt.text(),
                    // rating will be restored by calling clear method
                    originalRatingValue: $opt.val(),
                    originalRatingText: ($opt.data('html')) ? $opt.data('html') : $opt.text()

                });

                // first OPTION empty - allow deselecting of ratings
                self.$elem.data('barrating').deselectable =
                        (!self.$elem.find('option:first').val()) ? true : false;
            };

            // remove data on element
            var removeDataOnElement = function () {
                self.$elem.removeData('barrating');
            };

            // build widget and return jQuery element
            var buildWidget = function () {
                var $w = $('<div />', {
                    'class': 'br-widget'
                });

                // create A elements that will replace OPTIONs
                self.$elem.find('option').each(function () {
                    var val, text, html, $a, $span;

                    val = $(this).val();

                    // create ratings - but only if val is defined
                    if (val) {
                        text = $(this).text();
                        html = $(this).data('html');
                        if (html) {
                            text = html;
                        }

                        $a = $('<a />', {
                            'href': '#',
                            'data-rating-value': val,
                            'data-rating-text': text
                        });
                        $span = $('<span />', {
                            'html': (self.options.showValues) ? text : ''
                        });

                        $w.append($a.append($span));
                    }

                });

                // append .br-current-rating div to the widget
                if (self.options.showSelectedRating) {
                    $w.prepend($('<div />', {
                        'text': '',
                        'class': 'br-current-rating'
                    }));
                }

                // additional classes for the widget
                if (self.options.reverse) {
                    $w.addClass('br-reverse');
                }

                if (self.options.readonly) {
                    $w.addClass('br-readonly');
                }

                return $w;
            };

            // return a jQuery function name depending on the 'reverse' setting
            var nextAllorPreviousAll = function () {
                if (self.options.reverse) {
                    return 'nextAll';
                } else {
                    return 'prevAll';
                }
            };

            // set the value of the select field
            var setSelectFieldValue = function (value) {
                // change selected OPTION in the select field (hidden)
                self.$elem.find('option[value="' + value + '"]').prop('selected', true);
                self.$elem.change();
            };

            // display the currently selected rating
            var showSelectedRating = function (text) {
                // text undefined?
                text = text ? text : self.$elem.data('barrating').currentRatingText;

                // update .br-current-rating div
                if (self.options.showSelectedRating) {
                    self.$elem.parent().find('.br-current-rating').text(text);
                }
            };

            // apply style by setting classes on elements
            var applyStyle = function ($w) {
                // remove classes
                $w.find('a').removeClass('br-selected br-current');

                // add classes
                $w.find('a[data-rating-value="' + self.$elem.data('barrating').currentRatingValue + '"]')
                        .addClass('br-selected br-current')[nextAllorPreviousAll()]()
                        .addClass('br-selected');
            };

            // handle click events
            var attachClickHandler = function ($all) {
                $all.on('click', function (event) {
                    var $a = $(this),
                            value,
                            text;

                    event.preventDefault();

                    $all.removeClass('br-active br-selected');
                    $a.addClass('br-selected')[nextAllorPreviousAll()]()
                            .addClass('br-selected');

                    value = $a.attr('data-rating-value');
                    text = $a.attr('data-rating-text');

                    // is current and deselectable?
                    if ($a.hasClass('br-current') && self.$elem.data('barrating').deselectable) {
                        $a.removeClass('br-selected br-current')[nextAllorPreviousAll()]()
                                .removeClass('br-selected br-current');
                        value = '';
                        text = '';
                    } else {
                        $all.removeClass('br-current');
                        $a.addClass('br-current');
                    }

                    // remember selected rating
                    self.$elem.data('barrating').currentRatingValue = value;
                    self.$elem.data('barrating').currentRatingText = text;

                    setSelectFieldValue(value);
                    showSelectedRating(text);

                    // onSelect callback
                    self.options.onSelect.call(
                            this,
                            self.$elem.data('barrating').currentRatingValue,
                            self.$elem.data('barrating').currentRatingText
                            );

                    return false;
                });
            };

            // handle mouseenter events
            var attachMouseEnterHandler = function ($all) {
                $all.on({
                    mouseenter: function () {
                        var $a = $(this);

                        $all.removeClass('br-active br-selected');
                        $a.addClass('br-active')[nextAllorPreviousAll()]()
                                .addClass('br-active');

                        showSelectedRating($a.attr('data-rating-text'));
                    }
                });
            };

            // handle mouseleave events
            var attachMouseLeaveHandler = function ($all, $widget) {
                $widget.on({
                    mouseleave: function () {
                        $all.removeClass('br-active');
                        showSelectedRating();
                        applyStyle($widget);
                    }
                });
            };

            // somewhat primitive way to remove 300ms click delay on touch devices
            // for a more advanced solution consider setting `fastClicks` option to false
            // and using a library such as fastclick (https://github.com/ftlabs/fastclick)
            var fastClicks = function ($all) {
                $all.on('touchstart', function (event) {
                    event.preventDefault();
                    event.stopPropagation();

                    $(this).click();
                });
            };

            // disable clicks
            var disableClicks = function ($all) {
                $all.on('click', function (event) {
                    event.preventDefault();
                });
            };

            this.show = function () {
                var $widget, $all;

                // run only once
                if (self.$elem.data('barrating'))
                    return;

                // wrap element
                wrapElement();

                // save data
                saveDataOnElement();

                // build & append widget to the DOM
                $widget = buildWidget();
                $widget.insertAfter(self.$elem);
                applyStyle($widget);

                showSelectedRating();

                $all = $widget.find('a');

                if (self.options.fastClicks) {
                    fastClicks($all);
                }

                if (self.options.readonly) {

                    // do not react to click events if rating is read-only
                    disableClicks($all);

                } else {

                    // attach click event handler
                    attachClickHandler($all);

                    // attach mouseenter event handler
                    attachMouseEnterHandler($all);

                    // attach mouseleave event handler
                    attachMouseLeaveHandler($all, $widget);

                }

                // hide the select field
                self.$elem.hide();
            };

            this.set = function (value) {
                if (!this.$elem.find('option[value="' + value + '"]').val())
                    return;

                // set data
                this.$elem.data('barrating').currentRatingValue = value;
                this.$elem.data('barrating').currentRatingText = this.$elem.find('option[value="' + value + '"]').text();

                setSelectFieldValue(this.$elem.data('barrating').currentRatingValue);
                showSelectedRating(this.$elem.data('barrating').currentRatingText);

                applyStyle(this.$widget);
            };

            this.clear = function () {
                // restore original data
                this.$elem.data('barrating').currentRatingValue = this.$elem.data('barrating').originalRatingValue;
                this.$elem.data('barrating').currentRatingText = this.$elem.data('barrating').originalRatingText;

                setSelectFieldValue(this.$elem.data('barrating').currentRatingValue);
                showSelectedRating(this.$elem.data('barrating').currentRatingText);

                applyStyle(this.$widget);

                // onClear callback
                this.$elem.data('barrating').userOptions.onClear.call(
                        this,
                        this.$elem.data('barrating').currentRatingValue,
                        this.$elem.data('barrating').currentRatingText
                        );
            };

            this.destroy = function () {
                var value = this.$elem.data('barrating').currentRatingValue;
                var text = this.$elem.data('barrating').currentRatingText;
                var options = this.$elem.data('barrating').userOptions;

                this.$widget.off().remove();

                // remove data
                removeDataOnElement();

                // unwrap the element
                unwrapElement();

                // show the element
                this.$elem.show();

                // onDestroy callback
                options.onDestroy.call(
                        this,
                        value,
                        text
                        );
            };
        }

        BarRating.prototype.init = function (options, elem) {
            this.$elem = $(elem);
            this.options = $.extend({}, $.fn.barrating.defaults, options);

            return this.options;
        };

        return BarRating;
    })();

    $.fn.barrating = function (method, options) {
        return this.each(function () {
            var plugin = new BarRating();

            // plugin works with select fields
            if (!$(this).is('select')) {
                $.error('Sorry, this plugin only works with select fields.');
            }

            // method supplied
            if (plugin.hasOwnProperty(method)) {
                plugin.init(options, this);
                if (method === 'show') {
                    return plugin.show(options);
                } else {
                    // plugin exists?
                    if (plugin.$elem.data('barrating')) {
                        plugin.$widget = $(this).next('.br-widget');
                        return plugin[method](options);
                    }
                }

                // no method supplied or only options supplied
            } else if (typeof method === 'object' || !method) {
                options = method;
                plugin.init(options, this);
                return plugin.show();

            } else {
                $.error('Method ' + method + ' does not exist on jQuery.barrating');
            }
        });
    };

    $.fn.barrating.defaults = {
        theme: '',
        initialRating: null, // initial rating
        showValues: false, // display rating values on the bars?
        showSelectedRating: true, // append a div with a rating to the widget?
        reverse: false, // reverse the rating?
        readonly: false, // make the rating ready-only?
        fastClicks: true, // remove 300ms click delay on touch devices?
        wrapperClass: 'br-wrapper', // class applied to wrapper div
        onSelect: function (value, text) {
        }, // callback fired when a rating is selected
        onClear: function (value, text) {
        }, // callback fired when a rating is cleared
        onDestroy: function (value, text) {
        } // callback fired when a widget is destroyed
    };

    return $.fn.barrating.defaults;

})(jQuery);

/*!
 * Select2 4.0.0
 * https://select2.github.io
 *
 * Released under the MIT license
 * https://github.com/select2/select2/blob/master/LICENSE.md
 */
(function (factory) {
    if (typeof define === 'function' && define.amd) {
        // AMD. Register as an anonymous module.
        define(['jquery'], factory);
    } else if (typeof exports === 'object') {
        // Node/CommonJS
        factory(require('jquery'));
    } else {
        // Browser globals
        factory(jQuery);
    }
}(function (jQuery) {
    // This is needed so we can catch the AMD loader configuration and use it
    // The inner file should be wrapped (by `banner.start.js`) in a function that
    // returns the AMD loader references.
    var S2 =
            (function () {
                // Restore the Select2 AMD loader so it can be used
                // Needed mostly in the language files, where the loader is not inserted
                if (jQuery && jQuery.fn && jQuery.fn.select2 && jQuery.fn.select2.amd) {
                    var S2 = jQuery.fn.select2.amd;
                }
                var S2;
                (function () {
                    if (!S2 || !S2.requirejs) {
                        if (!S2) {
                            S2 = {};
                        } else {
                            require = S2;
                        }
                        /**
                         * @license almond 0.2.9 Copyright (c) 2011-2014, The Dojo Foundation All Rights Reserved.
                         * Available via the MIT or new BSD license.
                         * see: http://github.com/jrburke/almond for details
                         */
//Going sloppy to avoid 'use strict' string cost, but strict practices should
//be followed.
                        /*jslint sloppy: true */
                        /*global setTimeout: false */

                        var requirejs, require, define;
                        (function (undef) {
                            var main, req, makeMap, handlers,
                                    defined = {},
                                    waiting = {},
                                    config = {},
                                    defining = {},
                                    hasOwn = Object.prototype.hasOwnProperty,
                                    aps = [].slice,
                                    jsSuffixRegExp = /\.js$/;

                            function hasProp(obj, prop) {
                                return hasOwn.call(obj, prop);
                            }

                            /**
                             * Given a relative module name, like ./something, normalize it to
                             * a real name that can be mapped to a path.
                             * @param {String} name the relative name
                             * @param {String} baseName a real name that the name arg is relative
                             * to.
                             * @returns {String} normalized name
                             */
                            function normalize(name, baseName) {
                                var nameParts, nameSegment, mapValue, foundMap, lastIndex,
                                        foundI, foundStarMap, starI, i, j, part,
                                        baseParts = baseName && baseName.split("/"),
                                        map = config.map,
                                        starMap = (map && map['*']) || {};

                                //Adjust any relative paths.
                                if (name && name.charAt(0) === ".") {
                                    //If have a base name, try to normalize against it,
                                    //otherwise, assume it is a top-level require that will
                                    //be relative to baseUrl in the end.
                                    if (baseName) {
                                        //Convert baseName to array, and lop off the last part,
                                        //so that . matches that "directory" and not name of the baseName's
                                        //module. For instance, baseName of "one/two/three", maps to
                                        //"one/two/three.js", but we want the directory, "one/two" for
                                        //this normalization.
                                        baseParts = baseParts.slice(0, baseParts.length - 1);
                                        name = name.split('/');
                                        lastIndex = name.length - 1;

                                        // Node .js allowance:
                                        if (config.nodeIdCompat && jsSuffixRegExp.test(name[lastIndex])) {
                                            name[lastIndex] = name[lastIndex].replace(jsSuffixRegExp, '');
                                        }

                                        name = baseParts.concat(name);

                                        //start trimDots
                                        for (i = 0; i < name.length; i += 1) {
                                            part = name[i];
                                            if (part === ".") {
                                                name.splice(i, 1);
                                                i -= 1;
                                            } else if (part === "..") {
                                                if (i === 1 && (name[2] === '..' || name[0] === '..')) {
                                                    //End of the line. Keep at least one non-dot
                                                    //path segment at the front so it can be mapped
                                                    //correctly to disk. Otherwise, there is likely
                                                    //no path mapping for a path starting with '..'.
                                                    //This can still fail, but catches the most reasonable
                                                    //uses of ..
                                                    break;
                                                } else if (i > 0) {
                                                    name.splice(i - 1, 2);
                                                    i -= 2;
                                                }
                                            }
                                        }
                                        //end trimDots

                                        name = name.join("/");
                                    } else if (name.indexOf('./') === 0) {
                                        // No baseName, so this is ID is resolved relative
                                        // to baseUrl, pull off the leading dot.
                                        name = name.substring(2);
                                    }
                                }

                                //Apply map config if available.
                                if ((baseParts || starMap) && map) {
                                    nameParts = name.split('/');

                                    for (i = nameParts.length; i > 0; i -= 1) {
                                        nameSegment = nameParts.slice(0, i).join("/");

                                        if (baseParts) {
                                            //Find the longest baseName segment match in the config.
                                            //So, do joins on the biggest to smallest lengths of baseParts.
                                            for (j = baseParts.length; j > 0; j -= 1) {
                                                mapValue = map[baseParts.slice(0, j).join('/')];

                                                //baseName segment has  config, find if it has one for
                                                //this name.
                                                if (mapValue) {
                                                    mapValue = mapValue[nameSegment];
                                                    if (mapValue) {
                                                        //Match, update name to the new value.
                                                        foundMap = mapValue;
                                                        foundI = i;
                                                        break;
                                                    }
                                                }
                                            }
                                        }

                                        if (foundMap) {
                                            break;
                                        }

                                        //Check for a star map match, but just hold on to it,
                                        //if there is a shorter segment match later in a matching
                                        //config, then favor over this star map.
                                        if (!foundStarMap && starMap && starMap[nameSegment]) {
                                            foundStarMap = starMap[nameSegment];
                                            starI = i;
                                        }
                                    }

                                    if (!foundMap && foundStarMap) {
                                        foundMap = foundStarMap;
                                        foundI = starI;
                                    }

                                    if (foundMap) {
                                        nameParts.splice(0, foundI, foundMap);
                                        name = nameParts.join('/');
                                    }
                                }

                                return name;
                            }

                            function makeRequire(relName, forceSync) {
                                return function () {
                                    //A version of a require function that passes a moduleName
                                    //value for items that may need to
                                    //look up paths relative to the moduleName
                                    return req.apply(undef, aps.call(arguments, 0).concat([relName, forceSync]));
                                };
                            }

                            function makeNormalize(relName) {
                                return function (name) {
                                    return normalize(name, relName);
                                };
                            }

                            function makeLoad(depName) {
                                return function (value) {
                                    defined[depName] = value;
                                };
                            }

                            function callDep(name) {
                                if (hasProp(waiting, name)) {
                                    var args = waiting[name];
                                    delete waiting[name];
                                    defining[name] = true;
                                    main.apply(undef, args);
                                }

                                if (!hasProp(defined, name) && !hasProp(defining, name)) {
                                    throw new Error('No ' + name);
                                }
                                return defined[name];
                            }

                            //Turns a plugin!resource to [plugin, resource]
                            //with the plugin being undefined if the name
                            //did not have a plugin prefix.
                            function splitPrefix(name) {
                                var prefix,
                                        index = name ? name.indexOf('!') : -1;
                                if (index > -1) {
                                    prefix = name.substring(0, index);
                                    name = name.substring(index + 1, name.length);
                                }
                                return [prefix, name];
                            }

                            /**
                             * Makes a name map, normalizing the name, and using a plugin
                             * for normalization if necessary. Grabs a ref to plugin
                             * too, as an optimization.
                             */
                            makeMap = function (name, relName) {
                                var plugin,
                                        parts = splitPrefix(name),
                                        prefix = parts[0];

                                name = parts[1];

                                if (prefix) {
                                    prefix = normalize(prefix, relName);
                                    plugin = callDep(prefix);
                                }

                                //Normalize according
                                if (prefix) {
                                    if (plugin && plugin.normalize) {
                                        name = plugin.normalize(name, makeNormalize(relName));
                                    } else {
                                        name = normalize(name, relName);
                                    }
                                } else {
                                    name = normalize(name, relName);
                                    parts = splitPrefix(name);
                                    prefix = parts[0];
                                    name = parts[1];
                                    if (prefix) {
                                        plugin = callDep(prefix);
                                    }
                                }

                                //Using ridiculous property names for space reasons
                                return {
                                    f: prefix ? prefix + '!' + name : name, //fullName
                                    n: name,
                                    pr: prefix,
                                    p: plugin
                                };
                            };

                            function makeConfig(name) {
                                return function () {
                                    return (config && config.config && config.config[name]) || {};
                                };
                            }

                            handlers = {
                                require: function (name) {
                                    return makeRequire(name);
                                },
                                exports: function (name) {
                                    var e = defined[name];
                                    if (typeof e !== 'undefined') {
                                        return e;
                                    } else {
                                        return (defined[name] = {});
                                    }
                                },
                                module: function (name) {
                                    return {
                                        id: name,
                                        uri: '',
                                        exports: defined[name],
                                        config: makeConfig(name)
                                    };
                                }
                            };

                            main = function (name, deps, callback, relName) {
                                var cjsModule, depName, ret, map, i,
                                        args = [],
                                        callbackType = typeof callback,
                                        usingExports;

                                //Use name if no relName
                                relName = relName || name;

                                //Call the callback to define the module, if necessary.
                                if (callbackType === 'undefined' || callbackType === 'function') {
                                    //Pull out the defined dependencies and pass the ordered
                                    //values to the callback.
                                    //Default to [require, exports, module] if no deps
                                    deps = !deps.length && callback.length ? ['require', 'exports', 'module'] : deps;
                                    for (i = 0; i < deps.length; i += 1) {
                                        map = makeMap(deps[i], relName);
                                        depName = map.f;

                                        //Fast path CommonJS standard dependencies.
                                        if (depName === "require") {
                                            args[i] = handlers.require(name);
                                        } else if (depName === "exports") {
                                            //CommonJS module spec 1.1
                                            args[i] = handlers.exports(name);
                                            usingExports = true;
                                        } else if (depName === "module") {
                                            //CommonJS module spec 1.1
                                            cjsModule = args[i] = handlers.module(name);
                                        } else if (hasProp(defined, depName) ||
                                                hasProp(waiting, depName) ||
                                                hasProp(defining, depName)) {
                                            args[i] = callDep(depName);
                                        } else if (map.p) {
                                            map.p.load(map.n, makeRequire(relName, true), makeLoad(depName), {});
                                            args[i] = defined[depName];
                                        } else {
                                            throw new Error(name + ' missing ' + depName);
                                        }
                                    }

                                    ret = callback ? callback.apply(defined[name], args) : undefined;

                                    if (name) {
                                        //If setting exports via "module" is in play,
                                        //favor that over return value and exports. After that,
                                        //favor a non-undefined return value over exports use.
                                        if (cjsModule && cjsModule.exports !== undef &&
                                                cjsModule.exports !== defined[name]) {
                                            defined[name] = cjsModule.exports;
                                        } else if (ret !== undef || !usingExports) {
                                            //Use the return value from the function.
                                            defined[name] = ret;
                                        }
                                    }
                                } else if (name) {
                                    //May just be an object definition for the module. Only
                                    //worry about defining if have a module name.
                                    defined[name] = callback;
                                }
                            };

                            requirejs = require = req = function (deps, callback, relName, forceSync, alt) {
                                if (typeof deps === "string") {
                                    if (handlers[deps]) {
                                        //callback in this case is really relName
                                        return handlers[deps](callback);
                                    }
                                    //Just return the module wanted. In this scenario, the
                                    //deps arg is the module name, and second arg (if passed)
                                    //is just the relName.
                                    //Normalize module name, if it contains . or ..
                                    return callDep(makeMap(deps, callback).f);
                                } else if (!deps.splice) {
                                    //deps is a config object, not an array.
                                    config = deps;
                                    if (config.deps) {
                                        req(config.deps, config.callback);
                                    }
                                    if (!callback) {
                                        return;
                                    }

                                    if (callback.splice) {
                                        //callback is an array, which means it is a dependency list.
                                        //Adjust args if there are dependencies
                                        deps = callback;
                                        callback = relName;
                                        relName = null;
                                    } else {
                                        deps = undef;
                                    }
                                }

                                //Support require(['a'])
                                callback = callback || function () {
                                };

                                //If relName is a function, it is an errback handler,
                                //so remove it.
                                if (typeof relName === 'function') {
                                    relName = forceSync;
                                    forceSync = alt;
                                }

                                //Simulate async callback;
                                if (forceSync) {
                                    main(undef, deps, callback, relName);
                                } else {
                                    //Using a non-zero value because of concern for what old browsers
                                    //do, and latest browsers "upgrade" to 4 if lower value is used:
                                    //http://www.whatwg.org/specs/web-apps/current-work/multipage/timers.html#dom-windowtimers-settimeout:
                                    //If want a value immediately, use require('id') instead -- something
                                    //that works in almond on the global level, but not guaranteed and
                                    //unlikely to work in other AMD implementations.
                                    setTimeout(function () {
                                        main(undef, deps, callback, relName);
                                    }, 4);
                                }

                                return req;
                            };

                            /**
                             * Just drops the config on the floor, but returns req in case
                             * the config return value is used.
                             */
                            req.config = function (cfg) {
                                return req(cfg);
                            };

                            /**
                             * Expose module registry for debugging and tooling
                             */
                            requirejs._defined = defined;

                            define = function (name, deps, callback) {

                                //This module may not have dependencies
                                if (!deps.splice) {
                                    //deps is not an array, so probably means
                                    //an object literal or factory function for
                                    //the value. Adjust args.
                                    callback = deps;
                                    deps = [];
                                }

                                if (!hasProp(defined, name) && !hasProp(waiting, name)) {
                                    waiting[name] = [name, deps, callback];
                                }
                            };

                            define.amd = {
                                jQuery: true
                            };
                        }());

                        S2.requirejs = requirejs;
                        S2.require = require;
                        S2.define = define;
                    }
                }());
                S2.define("almond", function () {
                });

                /* global jQuery:false, $:false */
                S2.define('jquery', [], function () {
                    var _$ = jQuery || $;

                    if (_$ == null && console && console.error) {
                        void 0;
                    }

                    return _$;
                });

                S2.define('select2/utils', [
                    'jquery'
                ], function ($) {
                    var Utils = {};

                    Utils.Extend = function (ChildClass, SuperClass) {
                        var __hasProp = {}.hasOwnProperty;

                        function BaseConstructor() {
                            this.constructor = ChildClass;
                        }

                        for (var key in SuperClass) {
                            if (__hasProp.call(SuperClass, key)) {
                                ChildClass[key] = SuperClass[key];
                            }
                        }

                        BaseConstructor.prototype = SuperClass.prototype;
                        ChildClass.prototype = new BaseConstructor();
                        ChildClass.__super__ = SuperClass.prototype;

                        return ChildClass;
                    };

                    function getMethods(theClass) {
                        var proto = theClass.prototype;

                        var methods = [];

                        for (var methodName in proto) {
                            var m = proto[methodName];

                            if (typeof m !== 'function') {
                                continue;
                            }

                            if (methodName === 'constructor') {
                                continue;
                            }

                            methods.push(methodName);
                        }

                        return methods;
                    }

                    Utils.Decorate = function (SuperClass, DecoratorClass) {
                        var decoratedMethods = getMethods(DecoratorClass);
                        var superMethods = getMethods(SuperClass);

                        function DecoratedClass() {
                            var unshift = Array.prototype.unshift;

                            var argCount = DecoratorClass.prototype.constructor.length;

                            var calledConstructor = SuperClass.prototype.constructor;

                            if (argCount > 0) {
                                unshift.call(arguments, SuperClass.prototype.constructor);

                                calledConstructor = DecoratorClass.prototype.constructor;
                            }

                            calledConstructor.apply(this, arguments);
                        }

                        DecoratorClass.displayName = SuperClass.displayName;

                        function ctr() {
                            this.constructor = DecoratedClass;
                        }

                        DecoratedClass.prototype = new ctr();

                        for (var m = 0; m < superMethods.length; m++) {
                            var superMethod = superMethods[m];

                            DecoratedClass.prototype[superMethod] =
                                    SuperClass.prototype[superMethod];
                        }

                        var calledMethod = function (methodName) {
                            // Stub out the original method if it's not decorating an actual method
                            var originalMethod = function () {
                            };

                            if (methodName in DecoratedClass.prototype) {
                                originalMethod = DecoratedClass.prototype[methodName];
                            }

                            var decoratedMethod = DecoratorClass.prototype[methodName];

                            return function () {
                                var unshift = Array.prototype.unshift;

                                unshift.call(arguments, originalMethod);

                                return decoratedMethod.apply(this, arguments);
                            };
                        };

                        for (var d = 0; d < decoratedMethods.length; d++) {
                            var decoratedMethod = decoratedMethods[d];

                            DecoratedClass.prototype[decoratedMethod] = calledMethod(decoratedMethod);
                        }

                        return DecoratedClass;
                    };

                    var Observable = function () {
                        this.listeners = {};
                    };

                    Observable.prototype.on = function (event, callback) {
                        this.listeners = this.listeners || {};

                        if (event in this.listeners) {
                            this.listeners[event].push(callback);
                        } else {
                            this.listeners[event] = [callback];
                        }
                    };

                    Observable.prototype.trigger = function (event) {
                        var slice = Array.prototype.slice;

                        this.listeners = this.listeners || {};

                        if (event in this.listeners) {
                            this.invoke(this.listeners[event], slice.call(arguments, 1));
                        }

                        if ('*' in this.listeners) {
                            this.invoke(this.listeners['*'], arguments);
                        }
                    };

                    Observable.prototype.invoke = function (listeners, params) {
                        for (var i = 0, len = listeners.length; i < len; i++) {
                            listeners[i].apply(this, params);
                        }
                    };

                    Utils.Observable = Observable;

                    Utils.generateChars = function (length) {
                        var chars = '';

                        for (var i = 0; i < length; i++) {
                            var randomChar = Math.floor(Math.random() * 36);
                            chars += randomChar.toString(36);
                        }

                        return chars;
                    };

                    Utils.bind = function (func, context) {
                        return function () {
                            func.apply(context, arguments);
                        };
                    };

                    Utils._convertData = function (data) {
                        for (var originalKey in data) {
                            var keys = originalKey.split('-');

                            var dataLevel = data;

                            if (keys.length === 1) {
                                continue;
                            }

                            for (var k = 0; k < keys.length; k++) {
                                var key = keys[k];

                                // Lowercase the first letter
                                // By default, dash-separated becomes camelCase
                                key = key.substring(0, 1).toLowerCase() + key.substring(1);

                                if (!(key in dataLevel)) {
                                    dataLevel[key] = {};
                                }

                                if (k == keys.length - 1) {
                                    dataLevel[key] = data[originalKey];
                                }

                                dataLevel = dataLevel[key];
                            }

                            delete data[originalKey];
                        }

                        return data;
                    };

                    Utils.hasScroll = function (index, el) {
                        // Adapted from the function created by @ShadowScripter
                        // and adapted by @BillBarry on the Stack Exchange Code Review website.
                        // The original code can be found at
                        // http://codereview.stackexchange.com/q/13338
                        // and was designed to be used with the Sizzle selector engine.

                        var $el = $(el);
                        var overflowX = el.style.overflowX;
                        var overflowY = el.style.overflowY;

                        //Check both x and y declarations
                        if (overflowX === overflowY &&
                                (overflowY === 'hidden' || overflowY === 'visible')) {
                            return false;
                        }

                        if (overflowX === 'scroll' || overflowY === 'scroll') {
                            return true;
                        }

                        return ($el.innerHeight() < el.scrollHeight ||
                                $el.innerWidth() < el.scrollWidth);
                    };

                    Utils.escapeMarkup = function (markup) {
                        var replaceMap = {
                            '\\': '&#92;',
                            '&': '&amp;',
                            '<': '&lt;',
                            '>': '&gt;',
                            '"': '&quot;',
                            '\'': '&#39;',
                            '/': '&#47;'
                        };

                        // Do not try to escape the markup if it's not a string
                        if (typeof markup !== 'string') {
                            return markup;
                        }

                        return String(markup).replace(/[&<>"'\/\\]/g, function (match) {
                            return replaceMap[match];
                        });
                    };

                    // Append an array of jQuery nodes to a given element.
                    Utils.appendMany = function ($element, $nodes) {
                        // jQuery 1.7.x does not support $.fn.append() with an array
                        // Fall back to a jQuery object collection using $.fn.add()
                        if ($.fn.jquery.substr(0, 3) === '1.7') {
                            var $jqNodes = $();

                            $.map($nodes, function (node) {
                                $jqNodes = $jqNodes.add(node);
                            });

                            $nodes = $jqNodes;
                        }

                        $element.append($nodes);
                    };

                    return Utils;
                });

                S2.define('select2/results', [
                    'jquery',
                    './utils'
                ], function ($, Utils) {
                    function Results($element, options, dataAdapter) {
                        this.$element = $element;
                        this.data = dataAdapter;
                        this.options = options;

                        Results.__super__.constructor.call(this);
                    }

                    Utils.Extend(Results, Utils.Observable);

                    Results.prototype.render = function () {
                        var $results = $(
                                '<ul class="select2-results__options" role="tree"></ul>'
                                );

                        if (this.options.get('multiple')) {
                            $results.attr('aria-multiselectable', 'true');
                        }

                        this.$results = $results;

                        return $results;
                    };

                    Results.prototype.clear = function () {
                        this.$results.empty();
                    };

                    Results.prototype.displayMessage = function (params) {
                        var escapeMarkup = this.options.get('escapeMarkup');

                        this.clear();
                        this.hideLoading();

                        var $message = $(
                                '<li role="treeitem" class="select2-results__option"></li>'
                                );

                        var message = this.options.get('translations').get(params.message);

                        $message.append(
                                escapeMarkup(
                                        message(params.args)
                                        )
                                );

                        this.$results.append($message);
                    };

                    Results.prototype.append = function (data) {
                        this.hideLoading();

                        var $options = [];

                        if (data.results == null || data.results.length === 0) {
                            if (this.$results.children().length === 0) {
                                this.trigger('results:message', {
                                    message: 'noResults'
                                });
                            }

                            return;
                        }

                        data.results = this.sort(data.results);

                        for (var d = 0; d < data.results.length; d++) {
                            var item = data.results[d];

                            var $option = this.option(item);

                            $options.push($option);
                        }

                        this.$results.append($options);
                    };

                    Results.prototype.position = function ($results, $dropdown) {
                        var $resultsContainer = $dropdown.find('.select2-results');
                        $resultsContainer.append($results);
                    };

                    Results.prototype.sort = function (data) {
                        var sorter = this.options.get('sorter');

                        return sorter(data);
                    };

                    Results.prototype.setClasses = function () {
                        var self = this;

                        this.data.current(function (selected) {
                            var selectedIds = $.map(selected, function (s) {
                                return s.id.toString();
                            });

                            var $options = self.$results
                                    .find('.select2-results__option[aria-selected]');

                            $options.each(function () {
                                var $option = $(this);

                                var item = $.data(this, 'data');

                                // id needs to be converted to a string when comparing
                                var id = '' + item.id;

                                if ((item.element != null && item.element.selected) ||
                                        (item.element == null && $.inArray(id, selectedIds) > -1)) {
                                    $option.attr('aria-selected', 'true');
                                } else {
                                    $option.attr('aria-selected', 'false');
                                }
                            });

                            var $selected = $options.filter('[aria-selected=true]');

                            // Check if there are any selected options
                            if ($selected.length > 0) {
                                // If there are selected options, highlight the first
                                $selected.first().trigger('mouseenter');
                            } else {
                                // If there are no selected options, highlight the first option
                                // in the dropdown
                                $options.first().trigger('mouseenter');
                            }
                        });
                    };

                    Results.prototype.showLoading = function (params) {
                        this.hideLoading();

                        var loadingMore = this.options.get('translations').get('searching');

                        var loading = {
                            disabled: true,
                            loading: true,
                            text: loadingMore(params)
                        };
                        var $loading = this.option(loading);
                        $loading.className += ' loading-results';

                        this.$results.prepend($loading);
                    };

                    Results.prototype.hideLoading = function () {
                        this.$results.find('.loading-results').remove();
                    };

                    Results.prototype.option = function (data) {
                        var option = document.createElement('li');
                        option.className = 'select2-results__option';

                        var attrs = {
                            'role': 'treeitem',
                            'aria-selected': 'false'
                        };

                        if (data.disabled) {
                            delete attrs['aria-selected'];
                            attrs['aria-disabled'] = 'true';
                        }

                        if (data.id == null) {
                            delete attrs['aria-selected'];
                        }

                        if (data._resultId != null) {
                            option.id = data._resultId;
                        }

                        if (data.title) {
                            option.title = data.title;
                        }

                        if (data.children) {
                            attrs.role = 'group';
                            attrs['aria-label'] = data.text;
                            delete attrs['aria-selected'];
                        }

                        for (var attr in attrs) {
                            var val = attrs[attr];

                            option.setAttribute(attr, val);
                        }

                        if (data.children) {
                            var $option = $(option);

                            var label = document.createElement('strong');
                            label.className = 'select2-results__group';

                            var $label = $(label);
                            this.template(data, label);

                            var $children = [];

                            for (var c = 0; c < data.children.length; c++) {
                                var child = data.children[c];

                                var $child = this.option(child);

                                $children.push($child);
                            }

                            var $childrenContainer = $('<ul></ul>', {
                                'class': 'select2-results__options select2-results__options--nested'
                            });

                            $childrenContainer.append($children);

                            $option.append(label);
                            $option.append($childrenContainer);
                        } else {
                            this.template(data, option);
                        }

                        $.data(option, 'data', data);

                        return option;
                    };

                    Results.prototype.bind = function (container, $container) {
                        var self = this;

                        var id = container.id + '-results';

                        this.$results.attr('id', id);

                        container.on('results:all', function (params) {
                            self.clear();
                            self.append(params.data);

                            if (container.isOpen()) {
                                self.setClasses();
                            }
                        });

                        container.on('results:append', function (params) {
                            self.append(params.data);

                            if (container.isOpen()) {
                                self.setClasses();
                            }
                        });

                        container.on('query', function (params) {
                            self.showLoading(params);
                        });

                        container.on('select', function () {
                            if (!container.isOpen()) {
                                return;
                            }

                            self.setClasses();
                        });

                        container.on('unselect', function () {
                            if (!container.isOpen()) {
                                return;
                            }

                            self.setClasses();
                        });

                        container.on('open', function () {
                            // When the dropdown is open, aria-expended="true"
                            self.$results.attr('aria-expanded', 'true');
                            self.$results.attr('aria-hidden', 'false');

                            self.setClasses();
                            self.ensureHighlightVisible();
                        });

                        container.on('close', function () {
                            // When the dropdown is closed, aria-expended="false"
                            self.$results.attr('aria-expanded', 'false');
                            self.$results.attr('aria-hidden', 'true');
                            self.$results.removeAttr('aria-activedescendant');
                        });

                        container.on('results:toggle', function () {
                            var $highlighted = self.getHighlightedResults();

                            if ($highlighted.length === 0) {
                                return;
                            }

                            $highlighted.trigger('mouseup');
                        });

                        container.on('results:select', function () {
                            var $highlighted = self.getHighlightedResults();

                            if ($highlighted.length === 0) {
                                return;
                            }

                            var data = $highlighted.data('data');

                            if ($highlighted.attr('aria-selected') == 'true') {
                                self.trigger('close');
                            } else {
                                self.trigger('select', {
                                    data: data
                                });
                            }
                        });

                        container.on('results:previous', function () {
                            var $highlighted = self.getHighlightedResults();

                            var $options = self.$results.find('[aria-selected]');

                            var currentIndex = $options.index($highlighted);

                            // If we are already at te top, don't move further
                            if (currentIndex === 0) {
                                return;
                            }

                            var nextIndex = currentIndex - 1;

                            // If none are highlighted, highlight the first
                            if ($highlighted.length === 0) {
                                nextIndex = 0;
                            }

                            var $next = $options.eq(nextIndex);

                            $next.trigger('mouseenter');

                            var currentOffset = self.$results.offset().top;
                            var nextTop = $next.offset().top;
                            var nextOffset = self.$results.scrollTop() + (nextTop - currentOffset);

                            if (nextIndex === 0) {
                                self.$results.scrollTop(0);
                            } else if (nextTop - currentOffset < 0) {
                                self.$results.scrollTop(nextOffset);
                            }
                        });

                        container.on('results:next', function () {
                            var $highlighted = self.getHighlightedResults();

                            var $options = self.$results.find('[aria-selected]');

                            var currentIndex = $options.index($highlighted);

                            var nextIndex = currentIndex + 1;

                            // If we are at the last option, stay there
                            if (nextIndex >= $options.length) {
                                return;
                            }

                            var $next = $options.eq(nextIndex);

                            $next.trigger('mouseenter');

                            var currentOffset = self.$results.offset().top +
                                    self.$results.outerHeight(false);
                            var nextBottom = $next.offset().top + $next.outerHeight(false);
                            var nextOffset = self.$results.scrollTop() + nextBottom - currentOffset;

                            if (nextIndex === 0) {
                                self.$results.scrollTop(0);
                            } else if (nextBottom > currentOffset) {
                                self.$results.scrollTop(nextOffset);
                            }
                        });

                        container.on('results:focus', function (params) {
                            params.element.addClass('select2-results__option--highlighted');
                        });

                        container.on('results:message', function (params) {
                            self.displayMessage(params);
                        });

                        if ($.fn.mousewheel) {
                            this.$results.on('mousewheel', function (e) {
                                var top = self.$results.scrollTop();

                                var bottom = (
                                        self.$results.get(0).scrollHeight -
                                        self.$results.scrollTop() +
                                        e.deltaY
                                        );

                                var isAtTop = e.deltaY > 0 && top - e.deltaY <= 0;
                                var isAtBottom = e.deltaY < 0 && bottom <= self.$results.height();

                                if (isAtTop) {
                                    self.$results.scrollTop(0);

                                    e.preventDefault();
                                    e.stopPropagation();
                                } else if (isAtBottom) {
                                    self.$results.scrollTop(
                                            self.$results.get(0).scrollHeight - self.$results.height()
                                            );

                                    e.preventDefault();
                                    e.stopPropagation();
                                }
                            });
                        }

                        this.$results.on('mouseup', '.select2-results__option[aria-selected]',
                                function (evt) {
                                    var $this = $(this);

                                    var data = $this.data('data');

                                    if ($this.attr('aria-selected') === 'true') {
                                        if (self.options.get('multiple')) {
                                            self.trigger('unselect', {
                                                originalEvent: evt,
                                                data: data
                                            });
                                        } else {
                                            self.trigger('close');
                                        }

                                        return;
                                    }

                                    self.trigger('select', {
                                        originalEvent: evt,
                                        data: data
                                    });
                                });

                        this.$results.on('mouseenter', '.select2-results__option[aria-selected]',
                                function (evt) {
                                    var data = $(this).data('data');

                                    self.getHighlightedResults()
                                            .removeClass('select2-results__option--highlighted');

                                    self.trigger('results:focus', {
                                        data: data,
                                        element: $(this)
                                    });
                                });
                    };

                    Results.prototype.getHighlightedResults = function () {
                        var $highlighted = this.$results
                                .find('.select2-results__option--highlighted');

                        return $highlighted;
                    };

                    Results.prototype.destroy = function () {
                        this.$results.remove();
                    };

                    Results.prototype.ensureHighlightVisible = function () {
                        var $highlighted = this.getHighlightedResults();

                        if ($highlighted.length === 0) {
                            return;
                        }

                        var $options = this.$results.find('[aria-selected]');

                        var currentIndex = $options.index($highlighted);

                        var currentOffset = this.$results.offset().top;
                        var nextTop = $highlighted.offset().top;
                        var nextOffset = this.$results.scrollTop() + (nextTop - currentOffset);

                        var offsetDelta = nextTop - currentOffset;
                        nextOffset -= $highlighted.outerHeight(false) * 2;

                        if (currentIndex <= 2) {
                            this.$results.scrollTop(0);
                        } else if (offsetDelta > this.$results.outerHeight() || offsetDelta < 0) {
                            this.$results.scrollTop(nextOffset);
                        }
                    };

                    Results.prototype.template = function (result, container) {
                        var template = this.options.get('templateResult');
                        var escapeMarkup = this.options.get('escapeMarkup');

                        var content = template(result);

                        if (content == null) {
                            container.style.display = 'none';
                        } else if (typeof content === 'string') {
                            container.innerHTML = escapeMarkup(content);
                        } else {
                            $(container).append(content);
                        }
                    };

                    return Results;
                });

                S2.define('select2/keys', [
                ], function () {
                    var KEYS = {
                        BACKSPACE: 8,
                        TAB: 9,
                        ENTER: 13,
                        SHIFT: 16,
                        CTRL: 17,
                        ALT: 18,
                        ESC: 27,
                        SPACE: 32,
                        PAGE_UP: 33,
                        PAGE_DOWN: 34,
                        END: 35,
                        HOME: 36,
                        LEFT: 37,
                        UP: 38,
                        RIGHT: 39,
                        DOWN: 40,
                        DELETE: 46
                    };

                    return KEYS;
                });

                S2.define('select2/selection/base', [
                    'jquery',
                    '../utils',
                    '../keys'
                ], function ($, Utils, KEYS) {
                    function BaseSelection($element, options) {
                        this.$element = $element;
                        this.options = options;

                        BaseSelection.__super__.constructor.call(this);
                    }

                    Utils.Extend(BaseSelection, Utils.Observable);

                    BaseSelection.prototype.render = function () {
                        var $selection = $(
                                '<span class="select2-selection" role="combobox" ' +
                                'aria-autocomplete="list" aria-haspopup="true" aria-expanded="false">' +
                                '</span>'
                                );

                        this._tabindex = 0;

                        if (this.$element.data('old-tabindex') != null) {
                            this._tabindex = this.$element.data('old-tabindex');
                        } else if (this.$element.attr('tabindex') != null) {
                            this._tabindex = this.$element.attr('tabindex');
                        }

                        $selection.attr('title', this.$element.attr('title'));
                        $selection.attr('tabindex', this._tabindex);

                        this.$selection = $selection;

                        return $selection;
                    };

                    BaseSelection.prototype.bind = function (container, $container) {
                        var self = this;

                        var id = container.id + '-container';
                        var resultsId = container.id + '-results';

                        this.container = container;

                        this.$selection.on('focus', function (evt) {
                            self.trigger('focus', evt);
                        });

                        this.$selection.on('blur', function (evt) {
                            self.trigger('blur', evt);
                        });

                        this.$selection.on('keydown', function (evt) {
                            self.trigger('keypress', evt);

                            if (evt.which === KEYS.SPACE) {
                                evt.preventDefault();
                            }
                        });

                        container.on('results:focus', function (params) {
                            self.$selection.attr('aria-activedescendant', params.data._resultId);
                        });

                        container.on('selection:update', function (params) {
                            self.update(params.data);
                        });

                        container.on('open', function () {
                            // When the dropdown is open, aria-expanded="true"
                            self.$selection.attr('aria-expanded', 'true');
                            self.$selection.attr('aria-owns', resultsId);

                            self._attachCloseHandler(container);
                        });

                        container.on('close', function () {
                            // When the dropdown is closed, aria-expanded="false"
                            self.$selection.attr('aria-expanded', 'false');
                            self.$selection.removeAttr('aria-activedescendant');
                            self.$selection.removeAttr('aria-owns');

                            self.$selection.focus();

                            self._detachCloseHandler(container);
                        });

                        container.on('enable', function () {
                            self.$selection.attr('tabindex', self._tabindex);
                        });

                        container.on('disable', function () {
                            self.$selection.attr('tabindex', '-1');
                        });
                    };

                    BaseSelection.prototype._attachCloseHandler = function (container) {
                        var self = this;

                        $(document.body).on('mousedown.select2.' + container.id, function (e) {
                            var $target = $(e.target);

                            var $select = $target.closest('.select2');

                            var $all = $('.select2.select2-container--open');

                            $all.each(function () {
                                var $this = $(this);

                                if (this == $select[0]) {
                                    return;
                                }

                                var $element = $this.data('element');

                                $element.select2('close');
                            });
                        });
                    };

                    BaseSelection.prototype._detachCloseHandler = function (container) {
                        $(document.body).off('mousedown.select2.' + container.id);
                    };

                    BaseSelection.prototype.position = function ($selection, $container) {
                        var $selectionContainer = $container.find('.selection');
                        $selectionContainer.append($selection);
                    };

                    BaseSelection.prototype.destroy = function () {
                        this._detachCloseHandler(this.container);
                    };

                    BaseSelection.prototype.update = function (data) {
                        throw new Error('The `update` method must be defined in child classes.');
                    };

                    return BaseSelection;
                });

                S2.define('select2/selection/single', [
                    'jquery',
                    './base',
                    '../utils',
                    '../keys'
                ], function ($, BaseSelection, Utils, KEYS) {
                    function SingleSelection() {
                        SingleSelection.__super__.constructor.apply(this, arguments);
                    }

                    Utils.Extend(SingleSelection, BaseSelection);

                    SingleSelection.prototype.render = function () {
                        var $selection = SingleSelection.__super__.render.call(this);

                        $selection.addClass('select2-selection--single');

                        $selection.html(
                                '<span class="select2-selection__rendered"></span>' +
                                '<span class="select2-selection__arrow" role="presentation">' +
                                '<b role="presentation"></b>' +
                                '</span>'
                                );

                        return $selection;
                    };

                    SingleSelection.prototype.bind = function (container, $container) {
                        var self = this;

                        SingleSelection.__super__.bind.apply(this, arguments);

                        var id = container.id + '-container';

                        this.$selection.find('.select2-selection__rendered').attr('id', id);
                        this.$selection.attr('aria-labelledby', id);

                        this.$selection.on('mousedown', function (evt) {
                            // Only respond to left clicks
                            if (evt.which !== 1) {
                                return;
                            }

                            self.trigger('toggle', {
                                originalEvent: evt
                            });
                        });

                        this.$selection.on('focus', function (evt) {
                            // User focuses on the container
                        });

                        this.$selection.on('blur', function (evt) {
                            // User exits the container
                        });

                        container.on('selection:update', function (params) {
                            self.update(params.data);
                        });
                    };

                    SingleSelection.prototype.clear = function () {
                        this.$selection.find('.select2-selection__rendered').empty();
                    };

                    SingleSelection.prototype.display = function (data) {
                        var template = this.options.get('templateSelection');
                        var escapeMarkup = this.options.get('escapeMarkup');

                        return escapeMarkup(template(data));
                    };

                    SingleSelection.prototype.selectionContainer = function () {
                        return $('<span></span>');
                    };

                    SingleSelection.prototype.update = function (data) {
                        if (data.length === 0) {
                            this.clear();
                            return;
                        }

                        var selection = data[0];

                        var formatted = this.display(selection);

                        var $rendered = this.$selection.find('.select2-selection__rendered');
                        $rendered.empty().append(formatted);
                        $rendered.prop('title', selection.title || selection.text);
                    };

                    return SingleSelection;
                });

                S2.define('select2/selection/multiple', [
                    'jquery',
                    './base',
                    '../utils'
                ], function ($, BaseSelection, Utils) {
                    function MultipleSelection($element, options) {
                        MultipleSelection.__super__.constructor.apply(this, arguments);
                    }

                    Utils.Extend(MultipleSelection, BaseSelection);

                    MultipleSelection.prototype.render = function () {
                        var $selection = MultipleSelection.__super__.render.call(this);

                        $selection.addClass('select2-selection--multiple');

                        $selection.html(
                                '<ul class="select2-selection__rendered"></ul>'
                                );

                        return $selection;
                    };

                    MultipleSelection.prototype.bind = function (container, $container) {
                        var self = this;

                        MultipleSelection.__super__.bind.apply(this, arguments);

                        this.$selection.on('click', function (evt) {
                            self.trigger('toggle', {
                                originalEvent: evt
                            });
                        });

                        this.$selection.on('click', '.select2-selection__choice__remove',
                                function (evt) {
                                    var $remove = $(this);
                                    var $selection = $remove.parent();

                                    var data = $selection.data('data');

                                    self.trigger('unselect', {
                                        originalEvent: evt,
                                        data: data
                                    });
                                });
                    };

                    MultipleSelection.prototype.clear = function () {
                        this.$selection.find('.select2-selection__rendered').empty();
                    };

                    MultipleSelection.prototype.display = function (data) {
                        var template = this.options.get('templateSelection');
                        var escapeMarkup = this.options.get('escapeMarkup');

                        return escapeMarkup(template(data));
                    };

                    MultipleSelection.prototype.selectionContainer = function () {
                        var $container = $(
                                '<li class="select2-selection__choice">' +
                                '<span class="select2-selection__choice__remove" role="presentation">' +
                                '&times;' +
                                '</span>' +
                                '</li>'
                                );

                        return $container;
                    };

                    MultipleSelection.prototype.update = function (data) {
                        this.clear();

                        if (data.length === 0) {
                            return;
                        }

                        var $selections = [];

                        for (var d = 0; d < data.length; d++) {
                            var selection = data[d];

                            var formatted = this.display(selection);
                            var $selection = this.selectionContainer();

                            $selection.append(formatted);
                            $selection.prop('title', selection.title || selection.text);

                            $selection.data('data', selection);

                            $selections.push($selection);
                        }

                        var $rendered = this.$selection.find('.select2-selection__rendered');

                        Utils.appendMany($rendered, $selections);
                    };

                    return MultipleSelection;
                });

                S2.define('select2/selection/placeholder', [
                    '../utils'
                ], function (Utils) {
                    function Placeholder(decorated, $element, options) {
                        this.placeholder = this.normalizePlaceholder(options.get('placeholder'));

                        decorated.call(this, $element, options);
                    }

                    Placeholder.prototype.normalizePlaceholder = function (_, placeholder) {
                        if (typeof placeholder === 'string') {
                            placeholder = {
                                id: '',
                                text: placeholder
                            };
                        }

                        return placeholder;
                    };

                    Placeholder.prototype.createPlaceholder = function (decorated, placeholder) {
                        var $placeholder = this.selectionContainer();

                        $placeholder.html(this.display(placeholder));
                        $placeholder.addClass('select2-selection__placeholder')
                                .removeClass('select2-selection__choice');

                        return $placeholder;
                    };

                    Placeholder.prototype.update = function (decorated, data) {
                        var singlePlaceholder = (
                                data.length == 1 && data[0].id != this.placeholder.id
                                );
                        var multipleSelections = data.length > 1;

                        if (multipleSelections || singlePlaceholder) {
                            return decorated.call(this, data);
                        }

                        this.clear();

                        var $placeholder = this.createPlaceholder(this.placeholder);

                        this.$selection.find('.select2-selection__rendered').append($placeholder);
                    };

                    return Placeholder;
                });

                S2.define('select2/selection/allowClear', [
                    'jquery',
                    '../keys'
                ], function ($, KEYS) {
                    function AllowClear() {
                    }

                    AllowClear.prototype.bind = function (decorated, container, $container) {
                        var self = this;

                        decorated.call(this, container, $container);

                        if (this.placeholder == null) {
                            if (this.options.get('debug') && window.console && console.error) {
                                void 0;
                            }
                        }

                        this.$selection.on('mousedown', '.select2-selection__clear',
                                function (evt) {
                                    self._handleClear(evt);
                                });

                        container.on('keypress', function (evt) {
                            self._handleKeyboardClear(evt, container);
                        });
                    };

                    AllowClear.prototype._handleClear = function (_, evt) {
                        // Ignore the event if it is disabled
                        if (this.options.get('disabled')) {
                            return;
                        }

                        var $clear = this.$selection.find('.select2-selection__clear');

                        // Ignore the event if nothing has been selected
                        if ($clear.length === 0) {
                            return;
                        }

                        evt.stopPropagation();

                        var data = $clear.data('data');

                        for (var d = 0; d < data.length; d++) {
                            var unselectData = {
                                data: data[d]
                            };

                            // Trigger the `unselect` event, so people can prevent it from being
                            // cleared.
                            this.trigger('unselect', unselectData);

                            // If the event was prevented, don't clear it out.
                            if (unselectData.prevented) {
                                return;
                            }
                        }

                        this.$element.val(this.placeholder.id).trigger('change');

                        this.trigger('toggle');
                    };

                    AllowClear.prototype._handleKeyboardClear = function (_, evt, container) {
                        if (container.isOpen()) {
                            return;
                        }

                        if (evt.which == KEYS.DELETE || evt.which == KEYS.BACKSPACE) {
                            this._handleClear(evt);
                        }
                    };

                    AllowClear.prototype.update = function (decorated, data) {
                        decorated.call(this, data);

                        if (this.$selection.find('.select2-selection__placeholder').length > 0 ||
                                data.length === 0) {
                            return;
                        }

                        var $remove = $(
                                '<span class="select2-selection__clear">' +
                                '&times;' +
                                '</span>'
                                );
                        $remove.data('data', data);

                        this.$selection.find('.select2-selection__rendered').prepend($remove);
                    };

                    return AllowClear;
                });

                S2.define('select2/selection/search', [
                    'jquery',
                    '../utils',
                    '../keys'
                ], function ($, Utils, KEYS) {
                    function Search(decorated, $element, options) {
                        decorated.call(this, $element, options);
                    }

                    Search.prototype.render = function (decorated) {
                        var $search = $(
                                '<li class="select2-search select2-search--inline">' +
                                '<input class="select2-search__field" type="search" tabindex="-1"' +
                                ' autocomplete="off" autocorrect="off" autocapitalize="off"' +
                                ' spellcheck="false" role="textbox" />' +
                                '</li>'
                                );

                        this.$searchContainer = $search;
                        this.$search = $search.find('input');

                        var $rendered = decorated.call(this);

                        return $rendered;
                    };

                    Search.prototype.bind = function (decorated, container, $container) {
                        var self = this;

                        decorated.call(this, container, $container);

                        container.on('open', function () {
                            self.$search.attr('tabindex', 0);

                            self.$search.focus();
                        });

                        container.on('close', function () {
                            self.$search.attr('tabindex', -1);

                            self.$search.val('');
                            self.$search.focus();
                        });

                        container.on('enable', function () {
                            self.$search.prop('disabled', false);
                        });

                        container.on('disable', function () {
                            self.$search.prop('disabled', true);
                        });

                        this.$selection.on('focusin', '.select2-search--inline', function (evt) {
                            self.trigger('focus', evt);
                        });

                        this.$selection.on('focusout', '.select2-search--inline', function (evt) {
                            self.trigger('blur', evt);
                        });

                        this.$selection.on('keydown', '.select2-search--inline', function (evt) {
                            evt.stopPropagation();

                            self.trigger('keypress', evt);

                            self._keyUpPrevented = evt.isDefaultPrevented();

                            var key = evt.which;

                            if (key === KEYS.BACKSPACE && self.$search.val() === '') {
                                var $previousChoice = self.$searchContainer
                                        .prev('.select2-selection__choice');

                                if ($previousChoice.length > 0) {
                                    var item = $previousChoice.data('data');

                                    self.searchRemoveChoice(item);

                                    evt.preventDefault();
                                }
                            }
                        });

                        // Workaround for browsers which do not support the `input` event
                        // This will prevent double-triggering of events for browsers which support
                        // both the `keyup` and `input` events.
                        this.$selection.on('input', '.select2-search--inline', function (evt) {
                            // Unbind the duplicated `keyup` event
                            self.$selection.off('keyup.search');
                        });

                        this.$selection.on('keyup.search input', '.select2-search--inline',
                                function (evt) {
                                    self.handleSearch(evt);
                                });
                    };

                    Search.prototype.createPlaceholder = function (decorated, placeholder) {
                        this.$search.attr('placeholder', placeholder.text);
                    };

                    Search.prototype.update = function (decorated, data) {
                        this.$search.attr('placeholder', '');

                        decorated.call(this, data);

                        this.$selection.find('.select2-selection__rendered')
                                .append(this.$searchContainer);

                        this.resizeSearch();
                    };

                    Search.prototype.handleSearch = function () {
                        this.resizeSearch();

                        if (!this._keyUpPrevented) {
                            var input = this.$search.val();

                            this.trigger('query', {
                                term: input
                            });
                        }

                        this._keyUpPrevented = false;
                    };

                    Search.prototype.searchRemoveChoice = function (decorated, item) {
                        this.trigger('unselect', {
                            data: item
                        });

                        this.trigger('open');

                        this.$search.val(item.text + ' ');
                    };

                    Search.prototype.resizeSearch = function () {
                        this.$search.css('width', '25px');

                        var width = '';

                        if (this.$search.attr('placeholder') !== '') {
                            width = this.$selection.find('.select2-selection__rendered').innerWidth();
                        } else {
                            var minimumWidth = this.$search.val().length + 1;

                            width = (minimumWidth * 0.75) + 'em';
                        }

                        this.$search.css('width', width);
                    };

                    return Search;
                });

                S2.define('select2/selection/eventRelay', [
                    'jquery'
                ], function ($) {
                    function EventRelay() {
                    }

                    EventRelay.prototype.bind = function (decorated, container, $container) {
                        var self = this;
                        var relayEvents = [
                            'open', 'opening',
                            'close', 'closing',
                            'select', 'selecting',
                            'unselect', 'unselecting'
                        ];

                        var preventableEvents = ['opening', 'closing', 'selecting', 'unselecting'];

                        decorated.call(this, container, $container);

                        container.on('*', function (name, params) {
                            // Ignore events that should not be relayed
                            if ($.inArray(name, relayEvents) === -1) {
                                return;
                            }

                            // The parameters should always be an object
                            params = params || {};

                            // Generate the jQuery event for the Select2 event
                            var evt = $.Event('select2:' + name, {
                                params: params
                            });

                            self.$element.trigger(evt);

                            // Only handle preventable events if it was one
                            if ($.inArray(name, preventableEvents) === -1) {
                                return;
                            }

                            params.prevented = evt.isDefaultPrevented();
                        });
                    };

                    return EventRelay;
                });

                S2.define('select2/translation', [
                    'jquery',
                    'require'
                ], function ($, require) {
                    function Translation(dict) {
                        this.dict = dict || {};
                    }

                    Translation.prototype.all = function () {
                        return this.dict;
                    };

                    Translation.prototype.get = function (key) {
                        return this.dict[key];
                    };

                    Translation.prototype.extend = function (translation) {
                        this.dict = $.extend({}, translation.all(), this.dict);
                    };

                    // Static functions

                    Translation._cache = {};

                    Translation.loadPath = function (path) {
                        if (!(path in Translation._cache)) {
                            var translations = require(path);

                            Translation._cache[path] = translations;
                        }

                        return new Translation(Translation._cache[path]);
                    };

                    return Translation;
                });

                S2.define('select2/diacritics', [
                ], function () {
                    var diacritics = {
                        '\u24B6': 'A',
                        '\uFF21': 'A',
                        '\u00C0': 'A',
                        '\u00C1': 'A',
                        '\u00C2': 'A',
                        '\u1EA6': 'A',
                        '\u1EA4': 'A',
                        '\u1EAA': 'A',
                        '\u1EA8': 'A',
                        '\u00C3': 'A',
                        '\u0100': 'A',
                        '\u0102': 'A',
                        '\u1EB0': 'A',
                        '\u1EAE': 'A',
                        '\u1EB4': 'A',
                        '\u1EB2': 'A',
                        '\u0226': 'A',
                        '\u01E0': 'A',
                        '\u00C4': 'A',
                        '\u01DE': 'A',
                        '\u1EA2': 'A',
                        '\u00C5': 'A',
                        '\u01FA': 'A',
                        '\u01CD': 'A',
                        '\u0200': 'A',
                        '\u0202': 'A',
                        '\u1EA0': 'A',
                        '\u1EAC': 'A',
                        '\u1EB6': 'A',
                        '\u1E00': 'A',
                        '\u0104': 'A',
                        '\u023A': 'A',
                        '\u2C6F': 'A',
                        '\uA732': 'AA',
                        '\u00C6': 'AE',
                        '\u01FC': 'AE',
                        '\u01E2': 'AE',
                        '\uA734': 'AO',
                        '\uA736': 'AU',
                        '\uA738': 'AV',
                        '\uA73A': 'AV',
                        '\uA73C': 'AY',
                        '\u24B7': 'B',
                        '\uFF22': 'B',
                        '\u1E02': 'B',
                        '\u1E04': 'B',
                        '\u1E06': 'B',
                        '\u0243': 'B',
                        '\u0182': 'B',
                        '\u0181': 'B',
                        '\u24B8': 'C',
                        '\uFF23': 'C',
                        '\u0106': 'C',
                        '\u0108': 'C',
                        '\u010A': 'C',
                        '\u010C': 'C',
                        '\u00C7': 'C',
                        '\u1E08': 'C',
                        '\u0187': 'C',
                        '\u023B': 'C',
                        '\uA73E': 'C',
                        '\u24B9': 'D',
                        '\uFF24': 'D',
                        '\u1E0A': 'D',
                        '\u010E': 'D',
                        '\u1E0C': 'D',
                        '\u1E10': 'D',
                        '\u1E12': 'D',
                        '\u1E0E': 'D',
                        '\u0110': 'D',
                        '\u018B': 'D',
                        '\u018A': 'D',
                        '\u0189': 'D',
                        '\uA779': 'D',
                        '\u01F1': 'DZ',
                        '\u01C4': 'DZ',
                        '\u01F2': 'Dz',
                        '\u01C5': 'Dz',
                        '\u24BA': 'E',
                        '\uFF25': 'E',
                        '\u00C8': 'E',
                        '\u00C9': 'E',
                        '\u00CA': 'E',
                        '\u1EC0': 'E',
                        '\u1EBE': 'E',
                        '\u1EC4': 'E',
                        '\u1EC2': 'E',
                        '\u1EBC': 'E',
                        '\u0112': 'E',
                        '\u1E14': 'E',
                        '\u1E16': 'E',
                        '\u0114': 'E',
                        '\u0116': 'E',
                        '\u00CB': 'E',
                        '\u1EBA': 'E',
                        '\u011A': 'E',
                        '\u0204': 'E',
                        '\u0206': 'E',
                        '\u1EB8': 'E',
                        '\u1EC6': 'E',
                        '\u0228': 'E',
                        '\u1E1C': 'E',
                        '\u0118': 'E',
                        '\u1E18': 'E',
                        '\u1E1A': 'E',
                        '\u0190': 'E',
                        '\u018E': 'E',
                        '\u24BB': 'F',
                        '\uFF26': 'F',
                        '\u1E1E': 'F',
                        '\u0191': 'F',
                        '\uA77B': 'F',
                        '\u24BC': 'G',
                        '\uFF27': 'G',
                        '\u01F4': 'G',
                        '\u011C': 'G',
                        '\u1E20': 'G',
                        '\u011E': 'G',
                        '\u0120': 'G',
                        '\u01E6': 'G',
                        '\u0122': 'G',
                        '\u01E4': 'G',
                        '\u0193': 'G',
                        '\uA7A0': 'G',
                        '\uA77D': 'G',
                        '\uA77E': 'G',
                        '\u24BD': 'H',
                        '\uFF28': 'H',
                        '\u0124': 'H',
                        '\u1E22': 'H',
                        '\u1E26': 'H',
                        '\u021E': 'H',
                        '\u1E24': 'H',
                        '\u1E28': 'H',
                        '\u1E2A': 'H',
                        '\u0126': 'H',
                        '\u2C67': 'H',
                        '\u2C75': 'H',
                        '\uA78D': 'H',
                        '\u24BE': 'I',
                        '\uFF29': 'I',
                        '\u00CC': 'I',
                        '\u00CD': 'I',
                        '\u00CE': 'I',
                        '\u0128': 'I',
                        '\u012A': 'I',
                        '\u012C': 'I',
                        '\u0130': 'I',
                        '\u00CF': 'I',
                        '\u1E2E': 'I',
                        '\u1EC8': 'I',
                        '\u01CF': 'I',
                        '\u0208': 'I',
                        '\u020A': 'I',
                        '\u1ECA': 'I',
                        '\u012E': 'I',
                        '\u1E2C': 'I',
                        '\u0197': 'I',
                        '\u24BF': 'J',
                        '\uFF2A': 'J',
                        '\u0134': 'J',
                        '\u0248': 'J',
                        '\u24C0': 'K',
                        '\uFF2B': 'K',
                        '\u1E30': 'K',
                        '\u01E8': 'K',
                        '\u1E32': 'K',
                        '\u0136': 'K',
                        '\u1E34': 'K',
                        '\u0198': 'K',
                        '\u2C69': 'K',
                        '\uA740': 'K',
                        '\uA742': 'K',
                        '\uA744': 'K',
                        '\uA7A2': 'K',
                        '\u24C1': 'L',
                        '\uFF2C': 'L',
                        '\u013F': 'L',
                        '\u0139': 'L',
                        '\u013D': 'L',
                        '\u1E36': 'L',
                        '\u1E38': 'L',
                        '\u013B': 'L',
                        '\u1E3C': 'L',
                        '\u1E3A': 'L',
                        '\u0141': 'L',
                        '\u023D': 'L',
                        '\u2C62': 'L',
                        '\u2C60': 'L',
                        '\uA748': 'L',
                        '\uA746': 'L',
                        '\uA780': 'L',
                        '\u01C7': 'LJ',
                        '\u01C8': 'Lj',
                        '\u24C2': 'M',
                        '\uFF2D': 'M',
                        '\u1E3E': 'M',
                        '\u1E40': 'M',
                        '\u1E42': 'M',
                        '\u2C6E': 'M',
                        '\u019C': 'M',
                        '\u24C3': 'N',
                        '\uFF2E': 'N',
                        '\u01F8': 'N',
                        '\u0143': 'N',
                        '\u00D1': 'N',
                        '\u1E44': 'N',
                        '\u0147': 'N',
                        '\u1E46': 'N',
                        '\u0145': 'N',
                        '\u1E4A': 'N',
                        '\u1E48': 'N',
                        '\u0220': 'N',
                        '\u019D': 'N',
                        '\uA790': 'N',
                        '\uA7A4': 'N',
                        '\u01CA': 'NJ',
                        '\u01CB': 'Nj',
                        '\u24C4': 'O',
                        '\uFF2F': 'O',
                        '\u00D2': 'O',
                        '\u00D3': 'O',
                        '\u00D4': 'O',
                        '\u1ED2': 'O',
                        '\u1ED0': 'O',
                        '\u1ED6': 'O',
                        '\u1ED4': 'O',
                        '\u00D5': 'O',
                        '\u1E4C': 'O',
                        '\u022C': 'O',
                        '\u1E4E': 'O',
                        '\u014C': 'O',
                        '\u1E50': 'O',
                        '\u1E52': 'O',
                        '\u014E': 'O',
                        '\u022E': 'O',
                        '\u0230': 'O',
                        '\u00D6': 'O',
                        '\u022A': 'O',
                        '\u1ECE': 'O',
                        '\u0150': 'O',
                        '\u01D1': 'O',
                        '\u020C': 'O',
                        '\u020E': 'O',
                        '\u01A0': 'O',
                        '\u1EDC': 'O',
                        '\u1EDA': 'O',
                        '\u1EE0': 'O',
                        '\u1EDE': 'O',
                        '\u1EE2': 'O',
                        '\u1ECC': 'O',
                        '\u1ED8': 'O',
                        '\u01EA': 'O',
                        '\u01EC': 'O',
                        '\u00D8': 'O',
                        '\u01FE': 'O',
                        '\u0186': 'O',
                        '\u019F': 'O',
                        '\uA74A': 'O',
                        '\uA74C': 'O',
                        '\u01A2': 'OI',
                        '\uA74E': 'OO',
                        '\u0222': 'OU',
                        '\u24C5': 'P',
                        '\uFF30': 'P',
                        '\u1E54': 'P',
                        '\u1E56': 'P',
                        '\u01A4': 'P',
                        '\u2C63': 'P',
                        '\uA750': 'P',
                        '\uA752': 'P',
                        '\uA754': 'P',
                        '\u24C6': 'Q',
                        '\uFF31': 'Q',
                        '\uA756': 'Q',
                        '\uA758': 'Q',
                        '\u024A': 'Q',
                        '\u24C7': 'R',
                        '\uFF32': 'R',
                        '\u0154': 'R',
                        '\u1E58': 'R',
                        '\u0158': 'R',
                        '\u0210': 'R',
                        '\u0212': 'R',
                        '\u1E5A': 'R',
                        '\u1E5C': 'R',
                        '\u0156': 'R',
                        '\u1E5E': 'R',
                        '\u024C': 'R',
                        '\u2C64': 'R',
                        '\uA75A': 'R',
                        '\uA7A6': 'R',
                        '\uA782': 'R',
                        '\u24C8': 'S',
                        '\uFF33': 'S',
                        '\u1E9E': 'S',
                        '\u015A': 'S',
                        '\u1E64': 'S',
                        '\u015C': 'S',
                        '\u1E60': 'S',
                        '\u0160': 'S',
                        '\u1E66': 'S',
                        '\u1E62': 'S',
                        '\u1E68': 'S',
                        '\u0218': 'S',
                        '\u015E': 'S',
                        '\u2C7E': 'S',
                        '\uA7A8': 'S',
                        '\uA784': 'S',
                        '\u24C9': 'T',
                        '\uFF34': 'T',
                        '\u1E6A': 'T',
                        '\u0164': 'T',
                        '\u1E6C': 'T',
                        '\u021A': 'T',
                        '\u0162': 'T',
                        '\u1E70': 'T',
                        '\u1E6E': 'T',
                        '\u0166': 'T',
                        '\u01AC': 'T',
                        '\u01AE': 'T',
                        '\u023E': 'T',
                        '\uA786': 'T',
                        '\uA728': 'TZ',
                        '\u24CA': 'U',
                        '\uFF35': 'U',
                        '\u00D9': 'U',
                        '\u00DA': 'U',
                        '\u00DB': 'U',
                        '\u0168': 'U',
                        '\u1E78': 'U',
                        '\u016A': 'U',
                        '\u1E7A': 'U',
                        '\u016C': 'U',
                        '\u00DC': 'U',
                        '\u01DB': 'U',
                        '\u01D7': 'U',
                        '\u01D5': 'U',
                        '\u01D9': 'U',
                        '\u1EE6': 'U',
                        '\u016E': 'U',
                        '\u0170': 'U',
                        '\u01D3': 'U',
                        '\u0214': 'U',
                        '\u0216': 'U',
                        '\u01AF': 'U',
                        '\u1EEA': 'U',
                        '\u1EE8': 'U',
                        '\u1EEE': 'U',
                        '\u1EEC': 'U',
                        '\u1EF0': 'U',
                        '\u1EE4': 'U',
                        '\u1E72': 'U',
                        '\u0172': 'U',
                        '\u1E76': 'U',
                        '\u1E74': 'U',
                        '\u0244': 'U',
                        '\u24CB': 'V',
                        '\uFF36': 'V',
                        '\u1E7C': 'V',
                        '\u1E7E': 'V',
                        '\u01B2': 'V',
                        '\uA75E': 'V',
                        '\u0245': 'V',
                        '\uA760': 'VY',
                        '\u24CC': 'W',
                        '\uFF37': 'W',
                        '\u1E80': 'W',
                        '\u1E82': 'W',
                        '\u0174': 'W',
                        '\u1E86': 'W',
                        '\u1E84': 'W',
                        '\u1E88': 'W',
                        '\u2C72': 'W',
                        '\u24CD': 'X',
                        '\uFF38': 'X',
                        '\u1E8A': 'X',
                        '\u1E8C': 'X',
                        '\u24CE': 'Y',
                        '\uFF39': 'Y',
                        '\u1EF2': 'Y',
                        '\u00DD': 'Y',
                        '\u0176': 'Y',
                        '\u1EF8': 'Y',
                        '\u0232': 'Y',
                        '\u1E8E': 'Y',
                        '\u0178': 'Y',
                        '\u1EF6': 'Y',
                        '\u1EF4': 'Y',
                        '\u01B3': 'Y',
                        '\u024E': 'Y',
                        '\u1EFE': 'Y',
                        '\u24CF': 'Z',
                        '\uFF3A': 'Z',
                        '\u0179': 'Z',
                        '\u1E90': 'Z',
                        '\u017B': 'Z',
                        '\u017D': 'Z',
                        '\u1E92': 'Z',
                        '\u1E94': 'Z',
                        '\u01B5': 'Z',
                        '\u0224': 'Z',
                        '\u2C7F': 'Z',
                        '\u2C6B': 'Z',
                        '\uA762': 'Z',
                        '\u24D0': 'a',
                        '\uFF41': 'a',
                        '\u1E9A': 'a',
                        '\u00E0': 'a',
                        '\u00E1': 'a',
                        '\u00E2': 'a',
                        '\u1EA7': 'a',
                        '\u1EA5': 'a',
                        '\u1EAB': 'a',
                        '\u1EA9': 'a',
                        '\u00E3': 'a',
                        '\u0101': 'a',
                        '\u0103': 'a',
                        '\u1EB1': 'a',
                        '\u1EAF': 'a',
                        '\u1EB5': 'a',
                        '\u1EB3': 'a',
                        '\u0227': 'a',
                        '\u01E1': 'a',
                        '\u00E4': 'a',
                        '\u01DF': 'a',
                        '\u1EA3': 'a',
                        '\u00E5': 'a',
                        '\u01FB': 'a',
                        '\u01CE': 'a',
                        '\u0201': 'a',
                        '\u0203': 'a',
                        '\u1EA1': 'a',
                        '\u1EAD': 'a',
                        '\u1EB7': 'a',
                        '\u1E01': 'a',
                        '\u0105': 'a',
                        '\u2C65': 'a',
                        '\u0250': 'a',
                        '\uA733': 'aa',
                        '\u00E6': 'ae',
                        '\u01FD': 'ae',
                        '\u01E3': 'ae',
                        '\uA735': 'ao',
                        '\uA737': 'au',
                        '\uA739': 'av',
                        '\uA73B': 'av',
                        '\uA73D': 'ay',
                        '\u24D1': 'b',
                        '\uFF42': 'b',
                        '\u1E03': 'b',
                        '\u1E05': 'b',
                        '\u1E07': 'b',
                        '\u0180': 'b',
                        '\u0183': 'b',
                        '\u0253': 'b',
                        '\u24D2': 'c',
                        '\uFF43': 'c',
                        '\u0107': 'c',
                        '\u0109': 'c',
                        '\u010B': 'c',
                        '\u010D': 'c',
                        '\u00E7': 'c',
                        '\u1E09': 'c',
                        '\u0188': 'c',
                        '\u023C': 'c',
                        '\uA73F': 'c',
                        '\u2184': 'c',
                        '\u24D3': 'd',
                        '\uFF44': 'd',
                        '\u1E0B': 'd',
                        '\u010F': 'd',
                        '\u1E0D': 'd',
                        '\u1E11': 'd',
                        '\u1E13': 'd',
                        '\u1E0F': 'd',
                        '\u0111': 'd',
                        '\u018C': 'd',
                        '\u0256': 'd',
                        '\u0257': 'd',
                        '\uA77A': 'd',
                        '\u01F3': 'dz',
                        '\u01C6': 'dz',
                        '\u24D4': 'e',
                        '\uFF45': 'e',
                        '\u00E8': 'e',
                        '\u00E9': 'e',
                        '\u00EA': 'e',
                        '\u1EC1': 'e',
                        '\u1EBF': 'e',
                        '\u1EC5': 'e',
                        '\u1EC3': 'e',
                        '\u1EBD': 'e',
                        '\u0113': 'e',
                        '\u1E15': 'e',
                        '\u1E17': 'e',
                        '\u0115': 'e',
                        '\u0117': 'e',
                        '\u00EB': 'e',
                        '\u1EBB': 'e',
                        '\u011B': 'e',
                        '\u0205': 'e',
                        '\u0207': 'e',
                        '\u1EB9': 'e',
                        '\u1EC7': 'e',
                        '\u0229': 'e',
                        '\u1E1D': 'e',
                        '\u0119': 'e',
                        '\u1E19': 'e',
                        '\u1E1B': 'e',
                        '\u0247': 'e',
                        '\u025B': 'e',
                        '\u01DD': 'e',
                        '\u24D5': 'f',
                        '\uFF46': 'f',
                        '\u1E1F': 'f',
                        '\u0192': 'f',
                        '\uA77C': 'f',
                        '\u24D6': 'g',
                        '\uFF47': 'g',
                        '\u01F5': 'g',
                        '\u011D': 'g',
                        '\u1E21': 'g',
                        '\u011F': 'g',
                        '\u0121': 'g',
                        '\u01E7': 'g',
                        '\u0123': 'g',
                        '\u01E5': 'g',
                        '\u0260': 'g',
                        '\uA7A1': 'g',
                        '\u1D79': 'g',
                        '\uA77F': 'g',
                        '\u24D7': 'h',
                        '\uFF48': 'h',
                        '\u0125': 'h',
                        '\u1E23': 'h',
                        '\u1E27': 'h',
                        '\u021F': 'h',
                        '\u1E25': 'h',
                        '\u1E29': 'h',
                        '\u1E2B': 'h',
                        '\u1E96': 'h',
                        '\u0127': 'h',
                        '\u2C68': 'h',
                        '\u2C76': 'h',
                        '\u0265': 'h',
                        '\u0195': 'hv',
                        '\u24D8': 'i',
                        '\uFF49': 'i',
                        '\u00EC': 'i',
                        '\u00ED': 'i',
                        '\u00EE': 'i',
                        '\u0129': 'i',
                        '\u012B': 'i',
                        '\u012D': 'i',
                        '\u00EF': 'i',
                        '\u1E2F': 'i',
                        '\u1EC9': 'i',
                        '\u01D0': 'i',
                        '\u0209': 'i',
                        '\u020B': 'i',
                        '\u1ECB': 'i',
                        '\u012F': 'i',
                        '\u1E2D': 'i',
                        '\u0268': 'i',
                        '\u0131': 'i',
                        '\u24D9': 'j',
                        '\uFF4A': 'j',
                        '\u0135': 'j',
                        '\u01F0': 'j',
                        '\u0249': 'j',
                        '\u24DA': 'k',
                        '\uFF4B': 'k',
                        '\u1E31': 'k',
                        '\u01E9': 'k',
                        '\u1E33': 'k',
                        '\u0137': 'k',
                        '\u1E35': 'k',
                        '\u0199': 'k',
                        '\u2C6A': 'k',
                        '\uA741': 'k',
                        '\uA743': 'k',
                        '\uA745': 'k',
                        '\uA7A3': 'k',
                        '\u24DB': 'l',
                        '\uFF4C': 'l',
                        '\u0140': 'l',
                        '\u013A': 'l',
                        '\u013E': 'l',
                        '\u1E37': 'l',
                        '\u1E39': 'l',
                        '\u013C': 'l',
                        '\u1E3D': 'l',
                        '\u1E3B': 'l',
                        '\u017F': 'l',
                        '\u0142': 'l',
                        '\u019A': 'l',
                        '\u026B': 'l',
                        '\u2C61': 'l',
                        '\uA749': 'l',
                        '\uA781': 'l',
                        '\uA747': 'l',
                        '\u01C9': 'lj',
                        '\u24DC': 'm',
                        '\uFF4D': 'm',
                        '\u1E3F': 'm',
                        '\u1E41': 'm',
                        '\u1E43': 'm',
                        '\u0271': 'm',
                        '\u026F': 'm',
                        '\u24DD': 'n',
                        '\uFF4E': 'n',
                        '\u01F9': 'n',
                        '\u0144': 'n',
                        '\u00F1': 'n',
                        '\u1E45': 'n',
                        '\u0148': 'n',
                        '\u1E47': 'n',
                        '\u0146': 'n',
                        '\u1E4B': 'n',
                        '\u1E49': 'n',
                        '\u019E': 'n',
                        '\u0272': 'n',
                        '\u0149': 'n',
                        '\uA791': 'n',
                        '\uA7A5': 'n',
                        '\u01CC': 'nj',
                        '\u24DE': 'o',
                        '\uFF4F': 'o',
                        '\u00F2': 'o',
                        '\u00F3': 'o',
                        '\u00F4': 'o',
                        '\u1ED3': 'o',
                        '\u1ED1': 'o',
                        '\u1ED7': 'o',
                        '\u1ED5': 'o',
                        '\u00F5': 'o',
                        '\u1E4D': 'o',
                        '\u022D': 'o',
                        '\u1E4F': 'o',
                        '\u014D': 'o',
                        '\u1E51': 'o',
                        '\u1E53': 'o',
                        '\u014F': 'o',
                        '\u022F': 'o',
                        '\u0231': 'o',
                        '\u00F6': 'o',
                        '\u022B': 'o',
                        '\u1ECF': 'o',
                        '\u0151': 'o',
                        '\u01D2': 'o',
                        '\u020D': 'o',
                        '\u020F': 'o',
                        '\u01A1': 'o',
                        '\u1EDD': 'o',
                        '\u1EDB': 'o',
                        '\u1EE1': 'o',
                        '\u1EDF': 'o',
                        '\u1EE3': 'o',
                        '\u1ECD': 'o',
                        '\u1ED9': 'o',
                        '\u01EB': 'o',
                        '\u01ED': 'o',
                        '\u00F8': 'o',
                        '\u01FF': 'o',
                        '\u0254': 'o',
                        '\uA74B': 'o',
                        '\uA74D': 'o',
                        '\u0275': 'o',
                        '\u01A3': 'oi',
                        '\u0223': 'ou',
                        '\uA74F': 'oo',
                        '\u24DF': 'p',
                        '\uFF50': 'p',
                        '\u1E55': 'p',
                        '\u1E57': 'p',
                        '\u01A5': 'p',
                        '\u1D7D': 'p',
                        '\uA751': 'p',
                        '\uA753': 'p',
                        '\uA755': 'p',
                        '\u24E0': 'q',
                        '\uFF51': 'q',
                        '\u024B': 'q',
                        '\uA757': 'q',
                        '\uA759': 'q',
                        '\u24E1': 'r',
                        '\uFF52': 'r',
                        '\u0155': 'r',
                        '\u1E59': 'r',
                        '\u0159': 'r',
                        '\u0211': 'r',
                        '\u0213': 'r',
                        '\u1E5B': 'r',
                        '\u1E5D': 'r',
                        '\u0157': 'r',
                        '\u1E5F': 'r',
                        '\u024D': 'r',
                        '\u027D': 'r',
                        '\uA75B': 'r',
                        '\uA7A7': 'r',
                        '\uA783': 'r',
                        '\u24E2': 's',
                        '\uFF53': 's',
                        '\u00DF': 's',
                        '\u015B': 's',
                        '\u1E65': 's',
                        '\u015D': 's',
                        '\u1E61': 's',
                        '\u0161': 's',
                        '\u1E67': 's',
                        '\u1E63': 's',
                        '\u1E69': 's',
                        '\u0219': 's',
                        '\u015F': 's',
                        '\u023F': 's',
                        '\uA7A9': 's',
                        '\uA785': 's',
                        '\u1E9B': 's',
                        '\u24E3': 't',
                        '\uFF54': 't',
                        '\u1E6B': 't',
                        '\u1E97': 't',
                        '\u0165': 't',
                        '\u1E6D': 't',
                        '\u021B': 't',
                        '\u0163': 't',
                        '\u1E71': 't',
                        '\u1E6F': 't',
                        '\u0167': 't',
                        '\u01AD': 't',
                        '\u0288': 't',
                        '\u2C66': 't',
                        '\uA787': 't',
                        '\uA729': 'tz',
                        '\u24E4': 'u',
                        '\uFF55': 'u',
                        '\u00F9': 'u',
                        '\u00FA': 'u',
                        '\u00FB': 'u',
                        '\u0169': 'u',
                        '\u1E79': 'u',
                        '\u016B': 'u',
                        '\u1E7B': 'u',
                        '\u016D': 'u',
                        '\u00FC': 'u',
                        '\u01DC': 'u',
                        '\u01D8': 'u',
                        '\u01D6': 'u',
                        '\u01DA': 'u',
                        '\u1EE7': 'u',
                        '\u016F': 'u',
                        '\u0171': 'u',
                        '\u01D4': 'u',
                        '\u0215': 'u',
                        '\u0217': 'u',
                        '\u01B0': 'u',
                        '\u1EEB': 'u',
                        '\u1EE9': 'u',
                        '\u1EEF': 'u',
                        '\u1EED': 'u',
                        '\u1EF1': 'u',
                        '\u1EE5': 'u',
                        '\u1E73': 'u',
                        '\u0173': 'u',
                        '\u1E77': 'u',
                        '\u1E75': 'u',
                        '\u0289': 'u',
                        '\u24E5': 'v',
                        '\uFF56': 'v',
                        '\u1E7D': 'v',
                        '\u1E7F': 'v',
                        '\u028B': 'v',
                        '\uA75F': 'v',
                        '\u028C': 'v',
                        '\uA761': 'vy',
                        '\u24E6': 'w',
                        '\uFF57': 'w',
                        '\u1E81': 'w',
                        '\u1E83': 'w',
                        '\u0175': 'w',
                        '\u1E87': 'w',
                        '\u1E85': 'w',
                        '\u1E98': 'w',
                        '\u1E89': 'w',
                        '\u2C73': 'w',
                        '\u24E7': 'x',
                        '\uFF58': 'x',
                        '\u1E8B': 'x',
                        '\u1E8D': 'x',
                        '\u24E8': 'y',
                        '\uFF59': 'y',
                        '\u1EF3': 'y',
                        '\u00FD': 'y',
                        '\u0177': 'y',
                        '\u1EF9': 'y',
                        '\u0233': 'y',
                        '\u1E8F': 'y',
                        '\u00FF': 'y',
                        '\u1EF7': 'y',
                        '\u1E99': 'y',
                        '\u1EF5': 'y',
                        '\u01B4': 'y',
                        '\u024F': 'y',
                        '\u1EFF': 'y',
                        '\u24E9': 'z',
                        '\uFF5A': 'z',
                        '\u017A': 'z',
                        '\u1E91': 'z',
                        '\u017C': 'z',
                        '\u017E': 'z',
                        '\u1E93': 'z',
                        '\u1E95': 'z',
                        '\u01B6': 'z',
                        '\u0225': 'z',
                        '\u0240': 'z',
                        '\u2C6C': 'z',
                        '\uA763': 'z',
                        '\u0386': '\u0391',
                        '\u0388': '\u0395',
                        '\u0389': '\u0397',
                        '\u038A': '\u0399',
                        '\u03AA': '\u0399',
                        '\u038C': '\u039F',
                        '\u038E': '\u03A5',
                        '\u03AB': '\u03A5',
                        '\u038F': '\u03A9',
                        '\u03AC': '\u03B1',
                        '\u03AD': '\u03B5',
                        '\u03AE': '\u03B7',
                        '\u03AF': '\u03B9',
                        '\u03CA': '\u03B9',
                        '\u0390': '\u03B9',
                        '\u03CC': '\u03BF',
                        '\u03CD': '\u03C5',
                        '\u03CB': '\u03C5',
                        '\u03B0': '\u03C5',
                        '\u03C9': '\u03C9',
                        '\u03C2': '\u03C3'
                    };

                    return diacritics;
                });

                S2.define('select2/data/base', [
                    '../utils'
                ], function (Utils) {
                    function BaseAdapter($element, options) {
                        BaseAdapter.__super__.constructor.call(this);
                    }

                    Utils.Extend(BaseAdapter, Utils.Observable);

                    BaseAdapter.prototype.current = function (callback) {
                        throw new Error('The `current` method must be defined in child classes.');
                    };

                    BaseAdapter.prototype.query = function (params, callback) {
                        throw new Error('The `query` method must be defined in child classes.');
                    };

                    BaseAdapter.prototype.bind = function (container, $container) {
                        // Can be implemented in subclasses
                    };

                    BaseAdapter.prototype.destroy = function () {
                        // Can be implemented in subclasses
                    };

                    BaseAdapter.prototype.generateResultId = function (container, data) {
                        var id = container.id + '-result-';

                        id += Utils.generateChars(4);

                        if (data.id != null) {
                            id += '-' + data.id.toString();
                        } else {
                            id += '-' + Utils.generateChars(4);
                        }
                        return id;
                    };

                    return BaseAdapter;
                });

                S2.define('select2/data/select', [
                    './base',
                    '../utils',
                    'jquery'
                ], function (BaseAdapter, Utils, $) {
                    function SelectAdapter($element, options) {
                        this.$element = $element;
                        this.options = options;

                        SelectAdapter.__super__.constructor.call(this);
                    }

                    Utils.Extend(SelectAdapter, BaseAdapter);

                    SelectAdapter.prototype.current = function (callback) {
                        var data = [];
                        var self = this;

                        this.$element.find(':selected').each(function () {
                            var $option = $(this);

                            var option = self.item($option);

                            data.push(option);
                        });

                        callback(data);
                    };

                    SelectAdapter.prototype.select = function (data) {
                        var self = this;

                        data.selected = true;

                        // If data.element is a DOM node, use it instead
                        if ($(data.element).is('option')) {
                            data.element.selected = true;

                            this.$element.trigger('change');

                            return;
                        }

                        if (this.$element.prop('multiple')) {
                            this.current(function (currentData) {
                                var val = [];

                                data = [data];
                                data.push.apply(data, currentData);

                                for (var d = 0; d < data.length; d++) {
                                    var id = data[d].id;

                                    if ($.inArray(id, val) === -1) {
                                        val.push(id);
                                    }
                                }

                                self.$element.val(val);
                                self.$element.trigger('change');
                            });
                        } else {
                            var val = data.id;

                            this.$element.val(val);
                            this.$element.trigger('change');
                        }
                    };

                    SelectAdapter.prototype.unselect = function (data) {
                        var self = this;

                        if (!this.$element.prop('multiple')) {
                            return;
                        }

                        data.selected = false;

                        if ($(data.element).is('option')) {
                            data.element.selected = false;

                            this.$element.trigger('change');

                            return;
                        }

                        this.current(function (currentData) {
                            var val = [];

                            for (var d = 0; d < currentData.length; d++) {
                                var id = currentData[d].id;

                                if (id !== data.id && $.inArray(id, val) === -1) {
                                    val.push(id);
                                }
                            }

                            self.$element.val(val);

                            self.$element.trigger('change');
                        });
                    };

                    SelectAdapter.prototype.bind = function (container, $container) {
                        var self = this;

                        this.container = container;

                        container.on('select', function (params) {
                            self.select(params.data);
                        });

                        container.on('unselect', function (params) {
                            self.unselect(params.data);
                        });
                    };

                    SelectAdapter.prototype.destroy = function () {
                        // Remove anything added to child elements
                        this.$element.find('*').each(function () {
                            // Remove any custom data set by Select2
                            $.removeData(this, 'data');
                        });
                    };

                    SelectAdapter.prototype.query = function (params, callback) {
                        var data = [];
                        var self = this;

                        var $options = this.$element.children();

                        $options.each(function () {
                            var $option = $(this);

                            if (!$option.is('option') && !$option.is('optgroup')) {
                                return;
                            }

                            var option = self.item($option);

                            var matches = self.matches(params, option);

                            if (matches !== null) {
                                data.push(matches);
                            }
                        });

                        callback({
                            results: data
                        });
                    };

                    SelectAdapter.prototype.addOptions = function ($options) {
                        Utils.appendMany(this.$element, $options);
                    };

                    SelectAdapter.prototype.option = function (data) {
                        var option;

                        if (data.children) {
                            option = document.createElement('optgroup');
                            option.label = data.text;
                        } else {
                            option = document.createElement('option');

                            if (option.textContent !== undefined) {
                                option.textContent = data.text;
                            } else {
                                option.innerText = data.text;
                            }
                        }

                        if (data.id) {
                            option.value = data.id;
                        }

                        if (data.disabled) {
                            option.disabled = true;
                        }

                        if (data.selected) {
                            option.selected = true;
                        }

                        if (data.title) {
                            option.title = data.title;
                        }

                        var $option = $(option);

                        var normalizedData = this._normalizeItem(data);
                        normalizedData.element = option;

                        // Override the option's data with the combined data
                        $.data(option, 'data', normalizedData);

                        return $option;
                    };

                    SelectAdapter.prototype.item = function ($option) {
                        var data = {};

                        data = $.data($option[0], 'data');

                        if (data != null) {
                            return data;
                        }

                        if ($option.is('option')) {
                            data = {
                                id: $option.val(),
                                text: $option.text(),
                                disabled: $option.prop('disabled'),
                                selected: $option.prop('selected'),
                                title: $option.prop('title')
                            };
                        } else if ($option.is('optgroup')) {
                            data = {
                                text: $option.prop('label'),
                                children: [],
                                title: $option.prop('title')
                            };

                            var $children = $option.children('option');
                            var children = [];

                            for (var c = 0; c < $children.length; c++) {
                                var $child = $($children[c]);

                                var child = this.item($child);

                                children.push(child);
                            }

                            data.children = children;
                        }

                        data = this._normalizeItem(data);
                        data.element = $option[0];

                        $.data($option[0], 'data', data);

                        return data;
                    };

                    SelectAdapter.prototype._normalizeItem = function (item) {
                        if (!$.isPlainObject(item)) {
                            item = {
                                id: item,
                                text: item
                            };
                        }

                        item = $.extend({}, {
                            text: ''
                        }, item);

                        var defaults = {
                            selected: false,
                            disabled: false
                        };

                        if (item.id != null) {
                            item.id = item.id.toString();
                        }

                        if (item.text != null) {
                            item.text = item.text.toString();
                        }

                        if (item._resultId == null && item.id && this.container != null) {
                            item._resultId = this.generateResultId(this.container, item);
                        }

                        return $.extend({}, defaults, item);
                    };

                    SelectAdapter.prototype.matches = function (params, data) {
                        var matcher = this.options.get('matcher');

                        return matcher(params, data);
                    };

                    return SelectAdapter;
                });

                S2.define('select2/data/array', [
                    './select',
                    '../utils',
                    'jquery'
                ], function (SelectAdapter, Utils, $) {
                    function ArrayAdapter($element, options) {
                        var data = options.get('data') || [];

                        ArrayAdapter.__super__.constructor.call(this, $element, options);

                        this.addOptions(this.convertToOptions(data));
                    }

                    Utils.Extend(ArrayAdapter, SelectAdapter);

                    ArrayAdapter.prototype.select = function (data) {
                        var $option = this.$element.find('option').filter(function (i, elm) {
                            return elm.value == data.id.toString();
                        });

                        if ($option.length === 0) {
                            $option = this.option(data);

                            this.addOptions($option);
                        }

                        ArrayAdapter.__super__.select.call(this, data);
                    };

                    ArrayAdapter.prototype.convertToOptions = function (data) {
                        var self = this;

                        var $existing = this.$element.find('option');
                        var existingIds = $existing.map(function () {
                            return self.item($(this)).id;
                        }).get();

                        var $options = [];

                        // Filter out all items except for the one passed in the argument
                        function onlyItem(item) {
                            return function () {
                                return $(this).val() == item.id;
                            };
                        }

                        for (var d = 0; d < data.length; d++) {
                            var item = this._normalizeItem(data[d]);

                            // Skip items which were pre-loaded, only merge the data
                            if ($.inArray(item.id, existingIds) >= 0) {
                                var $existingOption = $existing.filter(onlyItem(item));

                                var existingData = this.item($existingOption);
                                var newData = $.extend(true, {}, existingData, item);

                                var $newOption = this.option(existingData);

                                $existingOption.replaceWith($newOption);

                                continue;
                            }

                            var $option = this.option(item);

                            if (item.children) {
                                var $children = this.convertToOptions(item.children);

                                Utils.appendMany($option, $children);
                            }

                            $options.push($option);
                        }

                        return $options;
                    };

                    return ArrayAdapter;
                });

                S2.define('select2/data/ajax', [
                    './array',
                    '../utils',
                    'jquery'
                ], function (ArrayAdapter, Utils, $) {
                    function AjaxAdapter($element, options) {
                        this.ajaxOptions = this._applyDefaults(options.get('ajax'));

                        if (this.ajaxOptions.processResults != null) {
                            this.processResults = this.ajaxOptions.processResults;
                        }

                        ArrayAdapter.__super__.constructor.call(this, $element, options);
                    }

                    Utils.Extend(AjaxAdapter, ArrayAdapter);

                    AjaxAdapter.prototype._applyDefaults = function (options) {
                        var defaults = {
                            data: function (params) {
                                return {
                                    q: params.term
                                };
                            },
                            transport: function (params, success, failure) {
                                var $request = $.ajax(params);

                                $request.then(success);
                                $request.fail(failure);

                                return $request;
                            }
                        };

                        return $.extend({}, defaults, options, true);
                    };

                    AjaxAdapter.prototype.processResults = function (results) {
                        return results;
                    };

                    AjaxAdapter.prototype.query = function (params, callback) {
                        var matches = [];
                        var self = this;

                        if (this._request != null) {
                            // JSONP requests cannot always be aborted
                            if ($.isFunction(this._request.abort)) {
                                this._request.abort();
                            }

                            this._request = null;
                        }

                        var options = $.extend({
                            type: 'GET'
                        }, this.ajaxOptions);

                        if (typeof options.url === 'function') {
                            options.url = options.url(params);
                        }

                        if (typeof options.data === 'function') {
                            options.data = options.data(params);
                        }

                        function request() {
                            var $request = options.transport(options, function (data) {
                                var results = self.processResults(data, params);

                                if (self.options.get('debug') && window.console && console.error) {
                                    // Check to make sure that the response included a `results` key.
                                    if (!results || !results.results || !$.isArray(results.results)) {
                                        void 0;
                                    }
                                }

                                callback(results);
                            }, function () {
                                // TODO: Handle AJAX errors
                            });

                            self._request = $request;
                        }

                        if (this.ajaxOptions.delay && params.term !== '') {
                            if (this._queryTimeout) {
                                window.clearTimeout(this._queryTimeout);
                            }

                            this._queryTimeout = window.setTimeout(request, this.ajaxOptions.delay);
                        } else {
                            request();
                        }
                    };

                    return AjaxAdapter;
                });

                S2.define('select2/data/tags', [
                    'jquery'
                ], function ($) {
                    function Tags(decorated, $element, options) {
                        var tags = options.get('tags');

                        var createTag = options.get('createTag');

                        if (createTag !== undefined) {
                            this.createTag = createTag;
                        }

                        decorated.call(this, $element, options);

                        if ($.isArray(tags)) {
                            for (var t = 0; t < tags.length; t++) {
                                var tag = tags[t];
                                var item = this._normalizeItem(tag);

                                var $option = this.option(item);

                                this.$element.append($option);
                            }
                        }
                    }

                    Tags.prototype.query = function (decorated, params, callback) {
                        var self = this;

                        this._removeOldTags();

                        if (params.term == null || params.page != null) {
                            decorated.call(this, params, callback);
                            return;
                        }

                        function wrapper(obj, child) {
                            var data = obj.results;

                            for (var i = 0; i < data.length; i++) {
                                var option = data[i];

                                var checkChildren = (
                                        option.children != null &&
                                        !wrapper({
                                            results: option.children
                                        }, true)
                                        );

                                var checkText = option.text === params.term;

                                if (checkText || checkChildren) {
                                    if (child) {
                                        return false;
                                    }

                                    obj.data = data;
                                    callback(obj);

                                    return;
                                }
                            }

                            if (child) {
                                return true;
                            }

                            var tag = self.createTag(params);

                            if (tag != null) {
                                var $option = self.option(tag);
                                $option.attr('data-select2-tag', true);

                                self.addOptions([$option]);

                                self.insertTag(data, tag);
                            }

                            obj.results = data;

                            callback(obj);
                        }

                        decorated.call(this, params, wrapper);
                    };

                    Tags.prototype.createTag = function (decorated, params) {
                        var term = $.trim(params.term);

                        if (term === '') {
                            return null;
                        }

                        return {
                            id: term,
                            text: term
                        };
                    };

                    Tags.prototype.insertTag = function (_, data, tag) {
                        data.unshift(tag);
                    };

                    Tags.prototype._removeOldTags = function (_) {
                        var tag = this._lastTag;

                        var $options = this.$element.find('option[data-select2-tag]');

                        $options.each(function () {
                            if (this.selected) {
                                return;
                            }

                            $(this).remove();
                        });
                    };

                    return Tags;
                });

                S2.define('select2/data/tokenizer', [
                    'jquery'
                ], function ($) {
                    function Tokenizer(decorated, $element, options) {
                        var tokenizer = options.get('tokenizer');

                        if (tokenizer !== undefined) {
                            this.tokenizer = tokenizer;
                        }

                        decorated.call(this, $element, options);
                    }

                    Tokenizer.prototype.bind = function (decorated, container, $container) {
                        decorated.call(this, container, $container);

                        this.$search = container.dropdown.$search || container.selection.$search ||
                                $container.find('.select2-search__field');
                    };

                    Tokenizer.prototype.query = function (decorated, params, callback) {
                        var self = this;

                        function select(data) {
                            self.select(data);
                        }

                        params.term = params.term || '';

                        var tokenData = this.tokenizer(params, this.options, select);

                        if (tokenData.term !== params.term) {
                            // Replace the search term if we have the search box
                            if (this.$search.length) {
                                this.$search.val(tokenData.term);
                                this.$search.focus();
                            }

                            params.term = tokenData.term;
                        }

                        decorated.call(this, params, callback);
                    };

                    Tokenizer.prototype.tokenizer = function (_, params, options, callback) {
                        var separators = options.get('tokenSeparators') || [];
                        var term = params.term;
                        var i = 0;

                        var createTag = this.createTag || function (params) {
                            return {
                                id: params.term,
                                text: params.term
                            };
                        };

                        while (i < term.length) {
                            var termChar = term[i];

                            if ($.inArray(termChar, separators) === -1) {
                                i++;

                                continue;
                            }

                            var part = term.substr(0, i);
                            var partParams = $.extend({}, params, {
                                term: part
                            });

                            var data = createTag(partParams);

                            callback(data);

                            // Reset the term to not include the tokenized portion
                            term = term.substr(i + 1) || '';
                            i = 0;
                        }

                        return {
                            term: term
                        };
                    };

                    return Tokenizer;
                });

                S2.define('select2/data/minimumInputLength', [
                ], function () {
                    function MinimumInputLength(decorated, $e, options) {
                        this.minimumInputLength = options.get('minimumInputLength');

                        decorated.call(this, $e, options);
                    }

                    MinimumInputLength.prototype.query = function (decorated, params, callback) {
                        params.term = params.term || '';

                        if (params.term.length < this.minimumInputLength) {
                            this.trigger('results:message', {
                                message: 'inputTooShort',
                                args: {
                                    minimum: this.minimumInputLength,
                                    input: params.term,
                                    params: params
                                }
                            });

                            return;
                        }

                        decorated.call(this, params, callback);
                    };

                    return MinimumInputLength;
                });

                S2.define('select2/data/maximumInputLength', [
                ], function () {
                    function MaximumInputLength(decorated, $e, options) {
                        this.maximumInputLength = options.get('maximumInputLength');

                        decorated.call(this, $e, options);
                    }

                    MaximumInputLength.prototype.query = function (decorated, params, callback) {
                        params.term = params.term || '';

                        if (this.maximumInputLength > 0 &&
                                params.term.length > this.maximumInputLength) {
                            this.trigger('results:message', {
                                message: 'inputTooLong',
                                args: {
                                    maximum: this.maximumInputLength,
                                    input: params.term,
                                    params: params
                                }
                            });

                            return;
                        }

                        decorated.call(this, params, callback);
                    };

                    return MaximumInputLength;
                });

                S2.define('select2/data/maximumSelectionLength', [
                ], function () {
                    function MaximumSelectionLength(decorated, $e, options) {
                        this.maximumSelectionLength = options.get('maximumSelectionLength');

                        decorated.call(this, $e, options);
                    }

                    MaximumSelectionLength.prototype.query =
                            function (decorated, params, callback) {
                                var self = this;

                                this.current(function (currentData) {
                                    var count = currentData != null ? currentData.length : 0;
                                    if (self.maximumSelectionLength > 0 &&
                                            count >= self.maximumSelectionLength) {
                                        self.trigger('results:message', {
                                            message: 'maximumSelected',
                                            args: {
                                                maximum: self.maximumSelectionLength
                                            }
                                        });
                                        return;
                                    }
                                    decorated.call(self, params, callback);
                                });
                            };

                    return MaximumSelectionLength;
                });

                S2.define('select2/dropdown', [
                    'jquery',
                    './utils'
                ], function ($, Utils) {
                    function Dropdown($element, options) {
                        this.$element = $element;
                        this.options = options;

                        Dropdown.__super__.constructor.call(this);
                    }

                    Utils.Extend(Dropdown, Utils.Observable);

                    Dropdown.prototype.render = function () {
                        var $dropdown = $(
                                '<span class="select2-dropdown">' +
                                '<span class="select2-results"></span>' +
                                '</span>'
                                );

                        $dropdown.attr('dir', this.options.get('dir'));

                        this.$dropdown = $dropdown;

                        return $dropdown;
                    };

                    Dropdown.prototype.position = function ($dropdown, $container) {
                        // Should be implmented in subclasses
                    };

                    Dropdown.prototype.destroy = function () {
                        // Remove the dropdown from the DOM
                        this.$dropdown.remove();
                    };

                    return Dropdown;
                });

                S2.define('select2/dropdown/search', [
                    'jquery',
                    '../utils'
                ], function ($, Utils) {
                    function Search() {
                    }

                    Search.prototype.render = function (decorated) {
                        var $rendered = decorated.call(this);

                        var $search = $(
                                '<span class="select2-search select2-search--dropdown">' +
                                '<input class="select2-search__field" type="search" tabindex="-1"' +
                                ' autocomplete="off" autocorrect="off" autocapitalize="off"' +
                                ' spellcheck="false" role="textbox" />' +
                                '</span>'
                                );

                        this.$searchContainer = $search;
                        this.$search = $search.find('input');

                        $rendered.prepend($search);

                        return $rendered;
                    };

                    Search.prototype.bind = function (decorated, container, $container) {
                        var self = this;

                        decorated.call(this, container, $container);

                        this.$search.on('keydown', function (evt) {
                            self.trigger('keypress', evt);

                            self._keyUpPrevented = evt.isDefaultPrevented();
                        });

                        // Workaround for browsers which do not support the `input` event
                        // This will prevent double-triggering of events for browsers which support
                        // both the `keyup` and `input` events.
                        this.$search.on('input', function (evt) {
                            // Unbind the duplicated `keyup` event
                            $(this).off('keyup');
                        });

                        this.$search.on('keyup input', function (evt) {
                            self.handleSearch(evt);
                        });

                        container.on('open', function () {
                            self.$search.attr('tabindex', 0);

                            self.$search.focus();

                            window.setTimeout(function () {
                                self.$search.focus();
                            }, 0);
                        });

                        container.on('close', function () {
                            self.$search.attr('tabindex', -1);

                            self.$search.val('');
                        });

                        container.on('results:all', function (params) {
                            if (params.query.term == null || params.query.term === '') {
                                var showSearch = self.showSearch(params);

                                if (showSearch) {
                                    self.$searchContainer.removeClass('select2-search--hide');
                                } else {
                                    self.$searchContainer.addClass('select2-search--hide');
                                }
                            }
                        });
                    };

                    Search.prototype.handleSearch = function (evt) {
                        if (!this._keyUpPrevented) {
                            var input = this.$search.val();

                            this.trigger('query', {
                                term: input
                            });
                        }

                        this._keyUpPrevented = false;
                    };

                    Search.prototype.showSearch = function (_, params) {
                        return true;
                    };

                    return Search;
                });

                S2.define('select2/dropdown/hidePlaceholder', [
                ], function () {
                    function HidePlaceholder(decorated, $element, options, dataAdapter) {
                        this.placeholder = this.normalizePlaceholder(options.get('placeholder'));

                        decorated.call(this, $element, options, dataAdapter);
                    }

                    HidePlaceholder.prototype.append = function (decorated, data) {
                        data.results = this.removePlaceholder(data.results);

                        decorated.call(this, data);
                    };

                    HidePlaceholder.prototype.normalizePlaceholder = function (_, placeholder) {
                        if (typeof placeholder === 'string') {
                            placeholder = {
                                id: '',
                                text: placeholder
                            };
                        }

                        return placeholder;
                    };

                    HidePlaceholder.prototype.removePlaceholder = function (_, data) {
                        var modifiedData = data.slice(0);

                        for (var d = data.length - 1; d >= 0; d--) {
                            var item = data[d];

                            if (this.placeholder.id === item.id) {
                                modifiedData.splice(d, 1);
                            }
                        }

                        return modifiedData;
                    };

                    return HidePlaceholder;
                });

                S2.define('select2/dropdown/infiniteScroll', [
                    'jquery'
                ], function ($) {
                    function InfiniteScroll(decorated, $element, options, dataAdapter) {
                        this.lastParams = {};

                        decorated.call(this, $element, options, dataAdapter);

                        this.$loadingMore = this.createLoadingMore();
                        this.loading = false;
                    }

                    InfiniteScroll.prototype.append = function (decorated, data) {
                        this.$loadingMore.remove();
                        this.loading = false;

                        decorated.call(this, data);

                        if (this.showLoadingMore(data)) {
                            this.$results.append(this.$loadingMore);
                        }
                    };

                    InfiniteScroll.prototype.bind = function (decorated, container, $container) {
                        var self = this;

                        decorated.call(this, container, $container);

                        container.on('query', function (params) {
                            self.lastParams = params;
                            self.loading = true;
                        });

                        container.on('query:append', function (params) {
                            self.lastParams = params;
                            self.loading = true;
                        });

                        this.$results.on('scroll', function () {
                            var isLoadMoreVisible = $.contains(
                                    document.documentElement,
                                    self.$loadingMore[0]
                                    );

                            if (self.loading || !isLoadMoreVisible) {
                                return;
                            }

                            var currentOffset = self.$results.offset().top +
                                    self.$results.outerHeight(false);
                            var loadingMoreOffset = self.$loadingMore.offset().top +
                                    self.$loadingMore.outerHeight(false);

                            if (currentOffset + 50 >= loadingMoreOffset) {
                                self.loadMore();
                            }
                        });
                    };

                    InfiniteScroll.prototype.loadMore = function () {
                        this.loading = true;

                        var params = $.extend({}, {page: 1}, this.lastParams);

                        params.page++;

                        this.trigger('query:append', params);
                    };

                    InfiniteScroll.prototype.showLoadingMore = function (_, data) {
                        return data.pagination && data.pagination.more;
                    };

                    InfiniteScroll.prototype.createLoadingMore = function () {
                        var $option = $(
                                '<li class="option load-more" role="treeitem"></li>'
                                );

                        var message = this.options.get('translations').get('loadingMore');

                        $option.html(message(this.lastParams));

                        return $option;
                    };

                    return InfiniteScroll;
                });

                S2.define('select2/dropdown/attachBody', [
                    'jquery',
                    '../utils'
                ], function ($, Utils) {
                    function AttachBody(decorated, $element, options) {
                        this.$dropdownParent = options.get('dropdownParent') || document.body;

                        decorated.call(this, $element, options);
                    }

                    AttachBody.prototype.bind = function (decorated, container, $container) {
                        var self = this;

                        var setupResultsEvents = false;

                        decorated.call(this, container, $container);

                        container.on('open', function () {
                            self._showDropdown();
                            self._attachPositioningHandler(container);

                            if (!setupResultsEvents) {
                                setupResultsEvents = true;

                                container.on('results:all', function () {
                                    self._positionDropdown();
                                    self._resizeDropdown();
                                });

                                container.on('results:append', function () {
                                    self._positionDropdown();
                                    self._resizeDropdown();
                                });
                            }
                        });

                        container.on('close', function () {
                            self._hideDropdown();
                            self._detachPositioningHandler(container);
                        });

                        this.$dropdownContainer.on('mousedown', function (evt) {
                            evt.stopPropagation();
                        });
                    };

                    AttachBody.prototype.position = function (decorated, $dropdown, $container) {
                        // Clone all of the container classes
                        $dropdown.attr('class', $container.attr('class'));

                        $dropdown.removeClass('select2');
                        $dropdown.addClass('select2-container--open');

                        $dropdown.css({
                            position: 'absolute',
                            top: -999999
                        });

                        this.$container = $container;
                    };

                    AttachBody.prototype.render = function (decorated) {
                        var $container = $('<span></span>');

                        var $dropdown = decorated.call(this);
                        $container.append($dropdown);

                        this.$dropdownContainer = $container;

                        return $container;
                    };

                    AttachBody.prototype._hideDropdown = function (decorated) {
                        this.$dropdownContainer.detach();
                    };

                    AttachBody.prototype._attachPositioningHandler = function (container) {
                        var self = this;

                        var scrollEvent = 'scroll.select2.' + container.id;
                        var resizeEvent = 'resize.select2.' + container.id;
                        var orientationEvent = 'orientationchange.select2.' + container.id;

                        var $watchers = this.$container.parents().filter(Utils.hasScroll);
                        $watchers.each(function () {
                            $(this).data('select2-scroll-position', {
                                x: $(this).scrollLeft(),
                                y: $(this).scrollTop()
                            });
                        });

                        $watchers.on(scrollEvent, function (ev) {
                            var position = $(this).data('select2-scroll-position');
                            $(this).scrollTop(position.y);
                        });

                        $(window).on(scrollEvent + ' ' + resizeEvent + ' ' + orientationEvent,
                                function (e) {
                                    self._positionDropdown();
                                    self._resizeDropdown();
                                });
                    };

                    AttachBody.prototype._detachPositioningHandler = function (container) {
                        var scrollEvent = 'scroll.select2.' + container.id;
                        var resizeEvent = 'resize.select2.' + container.id;
                        var orientationEvent = 'orientationchange.select2.' + container.id;

                        var $watchers = this.$container.parents().filter(Utils.hasScroll);
                        $watchers.off(scrollEvent);

                        $(window).off(scrollEvent + ' ' + resizeEvent + ' ' + orientationEvent);
                    };

                    AttachBody.prototype._positionDropdown = function () {
                        var $window = $(window);

                        var isCurrentlyAbove = this.$dropdown.hasClass('select2-dropdown--above');
                        var isCurrentlyBelow = this.$dropdown.hasClass('select2-dropdown--below');

                        var newDirection = null;

                        var position = this.$container.position();
                        var offset = this.$container.offset();

                        offset.bottom = offset.top + this.$container.outerHeight(false);

                        var container = {
                            height: this.$container.outerHeight(false)
                        };

                        container.top = offset.top;
                        container.bottom = offset.top + container.height;

                        var dropdown = {
                            height: this.$dropdown.outerHeight(false)
                        };

                        var viewport = {
                            top: $window.scrollTop(),
                            bottom: $window.scrollTop() + $window.height()
                        };

                        var enoughRoomAbove = viewport.top < (offset.top - dropdown.height);
                        var enoughRoomBelow = viewport.bottom > (offset.bottom + dropdown.height);

                        var css = {
                            left: offset.left,
                            top: container.bottom
                        };

                        if (!isCurrentlyAbove && !isCurrentlyBelow) {
                            newDirection = 'below';
                        }

                        if (!enoughRoomBelow && enoughRoomAbove && !isCurrentlyAbove) {
                            newDirection = 'above';
                        } else if (!enoughRoomAbove && enoughRoomBelow && isCurrentlyAbove) {
                            newDirection = 'below';
                        }

                        if (newDirection == 'above' ||
                                (isCurrentlyAbove && newDirection !== 'below')) {
                            css.top = container.top - dropdown.height;
                        }

                        if (newDirection != null) {
                            this.$dropdown
                                    .removeClass('select2-dropdown--below select2-dropdown--above')
                                    .addClass('select2-dropdown--' + newDirection);
                            this.$container
                                    .removeClass('select2-container--below select2-container--above')
                                    .addClass('select2-container--' + newDirection);
                        }

                        this.$dropdownContainer.css(css);
                    };

                    AttachBody.prototype._resizeDropdown = function () {
                        this.$dropdownContainer.width();

                        var css = {
                            width: this.$container.outerWidth(false) + 'px'
                        };

                        if (this.options.get('dropdownAutoWidth')) {
                            css.minWidth = css.width;
                            css.width = 'auto';
                        }

                        this.$dropdown.css(css);
                    };

                    AttachBody.prototype._showDropdown = function (decorated) {
                        this.$dropdownContainer.appendTo(this.$dropdownParent);

                        this._positionDropdown();
                        this._resizeDropdown();
                    };

                    return AttachBody;
                });

                S2.define('select2/dropdown/minimumResultsForSearch', [
                ], function () {
                    function countResults(data) {
                        var count = 0;

                        for (var d = 0; d < data.length; d++) {
                            var item = data[d];

                            if (item.children) {
                                count += countResults(item.children);
                            } else {
                                count++;
                            }
                        }

                        return count;
                    }

                    function MinimumResultsForSearch(decorated, $element, options, dataAdapter) {
                        this.minimumResultsForSearch = options.get('minimumResultsForSearch');

                        if (this.minimumResultsForSearch < 0) {
                            this.minimumResultsForSearch = Infinity;
                        }

                        decorated.call(this, $element, options, dataAdapter);
                    }

                    MinimumResultsForSearch.prototype.showSearch = function (decorated, params) {
                        if (countResults(params.data.results) < this.minimumResultsForSearch) {
                            return false;
                        }

                        return decorated.call(this, params);
                    };

                    return MinimumResultsForSearch;
                });

                S2.define('select2/dropdown/selectOnClose', [
                ], function () {
                    function SelectOnClose() {
                    }

                    SelectOnClose.prototype.bind = function (decorated, container, $container) {
                        var self = this;

                        decorated.call(this, container, $container);

                        container.on('close', function () {
                            self._handleSelectOnClose();
                        });
                    };

                    SelectOnClose.prototype._handleSelectOnClose = function () {
                        var $highlightedResults = this.getHighlightedResults();

                        if ($highlightedResults.length < 1) {
                            return;
                        }

                        this.trigger('select', {
                            data: $highlightedResults.data('data')
                        });
                    };

                    return SelectOnClose;
                });

                S2.define('select2/dropdown/closeOnSelect', [
                ], function () {
                    function CloseOnSelect() {
                    }

                    CloseOnSelect.prototype.bind = function (decorated, container, $container) {
                        var self = this;

                        decorated.call(this, container, $container);

                        container.on('select', function (evt) {
                            self._selectTriggered(evt);
                        });

                        container.on('unselect', function (evt) {
                            self._selectTriggered(evt);
                        });
                    };

                    CloseOnSelect.prototype._selectTriggered = function (_, evt) {
                        var originalEvent = evt.originalEvent;

                        // Don't close if the control key is being held
                        if (originalEvent && originalEvent.ctrlKey) {
                            return;
                        }

                        this.trigger('close');
                    };

                    return CloseOnSelect;
                });

                S2.define('select2/i18n/en', [], function () {
                    // English
                    return {
                        errorLoading: function () {
                            return 'The results could not be loaded.';
                        },
                        inputTooLong: function (args) {
                            var overChars = args.input.length - args.maximum;

                            var message = 'Please delete ' + overChars + ' character';

                            if (overChars != 1) {
                                message += 's';
                            }

                            return message;
                        },
                        inputTooShort: function (args) {
                            var remainingChars = args.minimum - args.input.length;

                            var message = 'Please enter ' + remainingChars + ' or more characters';

                            return message;
                        },
                        loadingMore: function () {
                            return 'Loading more results…';
                        },
                        maximumSelected: function (args) {
                            var message = 'You can only select ' + args.maximum + ' item';

                            if (args.maximum != 1) {
                                message += 's';
                            }

                            return message;
                        },
                        noResults: function () {
                            return 'No results found';
                        },
                        searching: function () {
                            return 'Searching…';
                        }
                    };
                });

                S2.define('select2/defaults', [
                    'jquery',
                    'require',
                    './results',
                    './selection/single',
                    './selection/multiple',
                    './selection/placeholder',
                    './selection/allowClear',
                    './selection/search',
                    './selection/eventRelay',
                    './utils',
                    './translation',
                    './diacritics',
                    './data/select',
                    './data/array',
                    './data/ajax',
                    './data/tags',
                    './data/tokenizer',
                    './data/minimumInputLength',
                    './data/maximumInputLength',
                    './data/maximumSelectionLength',
                    './dropdown',
                    './dropdown/search',
                    './dropdown/hidePlaceholder',
                    './dropdown/infiniteScroll',
                    './dropdown/attachBody',
                    './dropdown/minimumResultsForSearch',
                    './dropdown/selectOnClose',
                    './dropdown/closeOnSelect',
                    './i18n/en'
                ], function ($, require,
                        ResultsList,
                        SingleSelection, MultipleSelection, Placeholder, AllowClear,
                        SelectionSearch, EventRelay,
                        Utils, Translation, DIACRITICS,
                        SelectData, ArrayData, AjaxData, Tags, Tokenizer,
                        MinimumInputLength, MaximumInputLength, MaximumSelectionLength,
                        Dropdown, DropdownSearch, HidePlaceholder, InfiniteScroll,
                        AttachBody, MinimumResultsForSearch, SelectOnClose, CloseOnSelect,
                        EnglishTranslation) {
                    function Defaults() {
                        this.reset();
                    }

                    Defaults.prototype.apply = function (options) {
                        options = $.extend({}, this.defaults, options);

                        if (options.dataAdapter == null) {
                            if (options.ajax != null) {
                                options.dataAdapter = AjaxData;
                            } else if (options.data != null) {
                                options.dataAdapter = ArrayData;
                            } else {
                                options.dataAdapter = SelectData;
                            }

                            if (options.minimumInputLength > 0) {
                                options.dataAdapter = Utils.Decorate(
                                        options.dataAdapter,
                                        MinimumInputLength
                                        );
                            }

                            if (options.maximumInputLength > 0) {
                                options.dataAdapter = Utils.Decorate(
                                        options.dataAdapter,
                                        MaximumInputLength
                                        );
                            }

                            if (options.maximumSelectionLength > 0) {
                                options.dataAdapter = Utils.Decorate(
                                        options.dataAdapter,
                                        MaximumSelectionLength
                                        );
                            }

                            if (options.tags) {
                                options.dataAdapter = Utils.Decorate(options.dataAdapter, Tags);
                            }

                            if (options.tokenSeparators != null || options.tokenizer != null) {
                                options.dataAdapter = Utils.Decorate(
                                        options.dataAdapter,
                                        Tokenizer
                                        );
                            }

                            if (options.query != null) {
                                var Query = require(options.amdBase + 'compat/query');

                                options.dataAdapter = Utils.Decorate(
                                        options.dataAdapter,
                                        Query
                                        );
                            }

                            if (options.initSelection != null) {
                                var InitSelection = require(options.amdBase + 'compat/initSelection');

                                options.dataAdapter = Utils.Decorate(
                                        options.dataAdapter,
                                        InitSelection
                                        );
                            }
                        }

                        if (options.resultsAdapter == null) {
                            options.resultsAdapter = ResultsList;

                            if (options.ajax != null) {
                                options.resultsAdapter = Utils.Decorate(
                                        options.resultsAdapter,
                                        InfiniteScroll
                                        );
                            }

                            if (options.placeholder != null) {
                                options.resultsAdapter = Utils.Decorate(
                                        options.resultsAdapter,
                                        HidePlaceholder
                                        );
                            }

                            if (options.selectOnClose) {
                                options.resultsAdapter = Utils.Decorate(
                                        options.resultsAdapter,
                                        SelectOnClose
                                        );
                            }
                        }

                        if (options.dropdownAdapter == null) {
                            if (options.multiple) {
                                options.dropdownAdapter = Dropdown;
                            } else {
                                var SearchableDropdown = Utils.Decorate(Dropdown, DropdownSearch);

                                options.dropdownAdapter = SearchableDropdown;
                            }

                            if (options.minimumResultsForSearch !== 0) {
                                options.dropdownAdapter = Utils.Decorate(
                                        options.dropdownAdapter,
                                        MinimumResultsForSearch
                                        );
                            }

                            if (options.closeOnSelect) {
                                options.dropdownAdapter = Utils.Decorate(
                                        options.dropdownAdapter,
                                        CloseOnSelect
                                        );
                            }

                            if (
                                    options.dropdownCssClass != null ||
                                    options.dropdownCss != null ||
                                    options.adaptDropdownCssClass != null
                                    ) {
                                var DropdownCSS = require(options.amdBase + 'compat/dropdownCss');

                                options.dropdownAdapter = Utils.Decorate(
                                        options.dropdownAdapter,
                                        DropdownCSS
                                        );
                            }

                            options.dropdownAdapter = Utils.Decorate(
                                    options.dropdownAdapter,
                                    AttachBody
                                    );
                        }

                        if (options.selectionAdapter == null) {
                            if (options.multiple) {
                                options.selectionAdapter = MultipleSelection;
                            } else {
                                options.selectionAdapter = SingleSelection;
                            }

                            // Add the placeholder mixin if a placeholder was specified
                            if (options.placeholder != null) {
                                options.selectionAdapter = Utils.Decorate(
                                        options.selectionAdapter,
                                        Placeholder
                                        );
                            }

                            if (options.allowClear) {
                                options.selectionAdapter = Utils.Decorate(
                                        options.selectionAdapter,
                                        AllowClear
                                        );
                            }

                            if (options.multiple) {
                                options.selectionAdapter = Utils.Decorate(
                                        options.selectionAdapter,
                                        SelectionSearch
                                        );
                            }

                            if (
                                    options.containerCssClass != null ||
                                    options.containerCss != null ||
                                    options.adaptContainerCssClass != null
                                    ) {
                                var ContainerCSS = require(options.amdBase + 'compat/containerCss');

                                options.selectionAdapter = Utils.Decorate(
                                        options.selectionAdapter,
                                        ContainerCSS
                                        );
                            }

                            options.selectionAdapter = Utils.Decorate(
                                    options.selectionAdapter,
                                    EventRelay
                                    );
                        }

                        if (typeof options.language === 'string') {
                            // Check if the language is specified with a region
                            if (options.language.indexOf('-') > 0) {
                                // Extract the region information if it is included
                                var languageParts = options.language.split('-');
                                var baseLanguage = languageParts[0];

                                options.language = [options.language, baseLanguage];
                            } else {
                                options.language = [options.language];
                            }
                        }

                        if ($.isArray(options.language)) {
                            var languages = new Translation();
                            options.language.push('en');

                            var languageNames = options.language;

                            for (var l = 0; l < languageNames.length; l++) {
                                var name = languageNames[l];
                                var language = {};

                                try {
                                    // Try to load it with the original name
                                    language = Translation.loadPath(name);
                                } catch (e) {
                                    try {
                                        // If we couldn't load it, check if it wasn't the full path
                                        name = this.defaults.amdLanguageBase + name;
                                        language = Translation.loadPath(name);
                                    } catch (ex) {
                                        // The translation could not be loaded at all. Sometimes this is
                                        // because of a configuration problem, other times this can be
                                        // because of how Select2 helps load all possible translation files.
                                        if (options.debug && window.console && console.warn) {
                                            void 0;
                                        }

                                        continue;
                                    }
                                }

                                languages.extend(language);
                            }

                            options.translations = languages;
                        } else {
                            var baseTranslation = Translation.loadPath(
                                    this.defaults.amdLanguageBase + 'en'
                                    );
                            var customTranslation = new Translation(options.language);

                            customTranslation.extend(baseTranslation);

                            options.translations = customTranslation;
                        }

                        return options;
                    };

                    Defaults.prototype.reset = function () {
                        function stripDiacritics(text) {
                            // Used 'uni range + named function' from http://jsperf.com/diacritics/18
                            function match(a) {
                                return DIACRITICS[a] || a;
                            }

                            return text.replace(/[^\u0000-\u007E]/g, match);
                        }

                        function matcher(params, data) {
                            // Always return the object if there is nothing to compare
                            if ($.trim(params.term) === '') {
                                return data;
                            }

                            // Do a recursive check for options with children
                            if (data.children && data.children.length > 0) {
                                // Clone the data object if there are children
                                // This is required as we modify the object to remove any non-matches
                                var match = $.extend(true, {}, data);

                                // Check each child of the option
                                for (var c = data.children.length - 1; c >= 0; c--) {
                                    var child = data.children[c];

                                    var matches = matcher(params, child);

                                    // If there wasn't a match, remove the object in the array
                                    if (matches == null) {
                                        match.children.splice(c, 1);
                                    }
                                }

                                // If any children matched, return the new object
                                if (match.children.length > 0) {
                                    return match;
                                }

                                // If there were no matching children, check just the plain object
                                return matcher(params, match);
                            }

                            var original = stripDiacritics(data.text).toUpperCase();
                            var term = stripDiacritics(params.term).toUpperCase();

                            // Check if the text contains the term
                            if (original.indexOf(term) > -1) {
                                return data;
                            }

                            // If it doesn't contain the term, don't return anything
                            return null;
                        }

                        this.defaults = {
                            amdBase: './',
                            amdLanguageBase: './i18n/',
                            closeOnSelect: true,
                            debug: false,
                            dropdownAutoWidth: false,
                            escapeMarkup: Utils.escapeMarkup,
                            language: EnglishTranslation,
                            matcher: matcher,
                            minimumInputLength: 0,
                            maximumInputLength: 0,
                            maximumSelectionLength: 0,
                            minimumResultsForSearch: 0,
                            selectOnClose: false,
                            sorter: function (data) {
                                return data;
                            },
                            templateResult: function (result) {
                                return result.text;
                            },
                            templateSelection: function (selection) {
                                return selection.text;
                            },
                            theme: 'default',
                            width: 'resolve'
                        };
                    };

                    Defaults.prototype.set = function (key, value) {
                        var camelKey = $.camelCase(key);

                        var data = {};
                        data[camelKey] = value;

                        var convertedData = Utils._convertData(data);

                        $.extend(this.defaults, convertedData);
                    };

                    var defaults = new Defaults();

                    return defaults;
                });

                S2.define('select2/options', [
                    'require',
                    'jquery',
                    './defaults',
                    './utils'
                ], function (require, $, Defaults, Utils) {
                    function Options(options, $element) {
                        this.options = options;

                        if ($element != null) {
                            this.fromElement($element);
                        }

                        this.options = Defaults.apply(this.options);

                        if ($element && $element.is('input')) {
                            var InputCompat = require(this.get('amdBase') + 'compat/inputData');

                            this.options.dataAdapter = Utils.Decorate(
                                    this.options.dataAdapter,
                                    InputCompat
                                    );
                        }
                    }

                    Options.prototype.fromElement = function ($e) {
                        var excludedData = ['select2'];

                        if (this.options.multiple == null) {
                            this.options.multiple = $e.prop('multiple');
                        }

                        if (this.options.disabled == null) {
                            this.options.disabled = $e.prop('disabled');
                        }

                        if (this.options.language == null) {
                            if ($e.prop('lang')) {
                                this.options.language = $e.prop('lang').toLowerCase();
                            } else if ($e.closest('[lang]').prop('lang')) {
                                this.options.language = $e.closest('[lang]').prop('lang');
                            }
                        }

                        if (this.options.dir == null) {
                            if ($e.prop('dir')) {
                                this.options.dir = $e.prop('dir');
                            } else if ($e.closest('[dir]').prop('dir')) {
                                this.options.dir = $e.closest('[dir]').prop('dir');
                            } else {
                                this.options.dir = 'ltr';
                            }
                        }

                        $e.prop('disabled', this.options.disabled);
                        $e.prop('multiple', this.options.multiple);

                        if ($e.data('select2Tags')) {
                            if (this.options.debug && window.console && console.warn) {
                                void 0;
                            }

                            $e.data('data', $e.data('select2Tags'));
                            $e.data('tags', true);
                        }

                        if ($e.data('ajaxUrl')) {
                            if (this.options.debug && window.console && console.warn) {
                                void 0;
                            }

                            $e.attr('ajax--url', $e.data('ajaxUrl'));
                            $e.data('ajax--url', $e.data('ajaxUrl'));
                        }

                        var dataset = {};

                        // Prefer the element's `dataset` attribute if it exists
                        // jQuery 1.x does not correctly handle data attributes with multiple dashes
                        if ($.fn.jquery && $.fn.jquery.substr(0, 2) == '1.' && $e[0].dataset) {
                            dataset = $.extend(true, {}, $e[0].dataset, $e.data());
                        } else {
                            dataset = $e.data();
                        }

                        var data = $.extend(true, {}, dataset);

                        data = Utils._convertData(data);

                        for (var key in data) {
                            if ($.inArray(key, excludedData) > -1) {
                                continue;
                            }

                            if ($.isPlainObject(this.options[key])) {
                                $.extend(this.options[key], data[key]);
                            } else {
                                this.options[key] = data[key];
                            }
                        }

                        return this;
                    };

                    Options.prototype.get = function (key) {
                        return this.options[key];
                    };

                    Options.prototype.set = function (key, val) {
                        this.options[key] = val;
                    };

                    return Options;
                });

                S2.define('select2/core', [
                    'jquery',
                    './options',
                    './utils',
                    './keys'
                ], function ($, Options, Utils, KEYS) {
                    var Select2 = function ($element, options) {
                        if ($element.data('select2') != null) {
                            $element.data('select2').destroy();
                        }

                        this.$element = $element;

                        this.id = this._generateId($element);

                        options = options || {};

                        this.options = new Options(options, $element);

                        Select2.__super__.constructor.call(this);

                        // Set up the tabindex

                        var tabindex = $element.attr('tabindex') || 0;
                        $element.data('old-tabindex', tabindex);
                        $element.attr('tabindex', '-1');

                        // Set up containers and adapters

                        var DataAdapter = this.options.get('dataAdapter');
                        this.dataAdapter = new DataAdapter($element, this.options);

                        var $container = this.render();

                        this._placeContainer($container);

                        var SelectionAdapter = this.options.get('selectionAdapter');
                        this.selection = new SelectionAdapter($element, this.options);
                        this.$selection = this.selection.render();

                        this.selection.position(this.$selection, $container);

                        var DropdownAdapter = this.options.get('dropdownAdapter');
                        this.dropdown = new DropdownAdapter($element, this.options);
                        this.$dropdown = this.dropdown.render();

                        this.dropdown.position(this.$dropdown, $container);

                        var ResultsAdapter = this.options.get('resultsAdapter');
                        this.results = new ResultsAdapter($element, this.options, this.dataAdapter);
                        this.$results = this.results.render();

                        this.results.position(this.$results, this.$dropdown);

                        // Bind events

                        var self = this;

                        // Bind the container to all of the adapters
                        this._bindAdapters();

                        // Register any DOM event handlers
                        this._registerDomEvents();

                        // Register any internal event handlers
                        this._registerDataEvents();
                        this._registerSelectionEvents();
                        this._registerDropdownEvents();
                        this._registerResultsEvents();
                        this._registerEvents();

                        // Set the initial state
                        this.dataAdapter.current(function (initialData) {
                            self.trigger('selection:update', {
                                data: initialData
                            });
                        });

                        // Hide the original select
                        $element.addClass('select2-hidden-accessible');
                        $element.attr('aria-hidden', 'true');

                        // Synchronize any monitored attributes
                        this._syncAttributes();

                        $element.data('select2', this);
                    };

                    Utils.Extend(Select2, Utils.Observable);

                    Select2.prototype._generateId = function ($element) {
                        var id = '';

                        if ($element.attr('id') != null) {
                            id = $element.attr('id');
                        } else if ($element.attr('name') != null) {
                            id = $element.attr('name') + '-' + Utils.generateChars(2);
                        } else {
                            id = Utils.generateChars(4);
                        }

                        id = 'select2-' + id;

                        return id;
                    };

                    Select2.prototype._placeContainer = function ($container) {
                        $container.insertAfter(this.$element);

                        var width = this._resolveWidth(this.$element, this.options.get('width'));

                        if (width != null) {
                            $container.css('width', width);
                        }
                    };

                    Select2.prototype._resolveWidth = function ($element, method) {
                        var WIDTH = /^width:(([-+]?([0-9]*\.)?[0-9]+)(px|em|ex|%|in|cm|mm|pt|pc))/i;

                        if (method == 'resolve') {
                            var styleWidth = this._resolveWidth($element, 'style');

                            if (styleWidth != null) {
                                return styleWidth;
                            }

                            return this._resolveWidth($element, 'element');
                        }

                        if (method == 'element') {
                            var elementWidth = $element.outerWidth(false);

                            if (elementWidth <= 0) {
                                return 'auto';
                            }

                            return elementWidth + 'px';
                        }

                        if (method == 'style') {
                            var style = $element.attr('style');

                            if (typeof (style) !== 'string') {
                                return null;
                            }

                            var attrs = style.split(';');

                            for (var i = 0, l = attrs.length; i < l; i = i + 1) {
                                var attr = attrs[i].replace(/\s/g, '');
                                var matches = attr.match(WIDTH);

                                if (matches !== null && matches.length >= 1) {
                                    return matches[1];
                                }
                            }

                            return null;
                        }

                        return method;
                    };

                    Select2.prototype._bindAdapters = function () {
                        this.dataAdapter.bind(this, this.$container);
                        this.selection.bind(this, this.$container);

                        this.dropdown.bind(this, this.$container);
                        this.results.bind(this, this.$container);
                    };

                    Select2.prototype._registerDomEvents = function () {
                        var self = this;

                        this.$element.on('change.select2', function () {
                            self.dataAdapter.current(function (data) {
                                self.trigger('selection:update', {
                                    data: data
                                });
                            });
                        });

                        this._sync = Utils.bind(this._syncAttributes, this);

                        if (this.$element[0].attachEvent) {
                            this.$element[0].attachEvent('onpropertychange', this._sync);
                        }

                        var observer = window.MutationObserver ||
                                window.WebKitMutationObserver ||
                                window.MozMutationObserver
                                ;

                        if (observer != null) {
                            this._observer = new observer(function (mutations) {
                                $.each(mutations, self._sync);
                            });
                            this._observer.observe(this.$element[0], {
                                attributes: true,
                                subtree: false
                            });
                        } else if (this.$element[0].addEventListener) {
                            this.$element[0].addEventListener('DOMAttrModified', self._sync, false);
                        }
                    };

                    Select2.prototype._registerDataEvents = function () {
                        var self = this;

                        this.dataAdapter.on('*', function (name, params) {
                            self.trigger(name, params);
                        });
                    };

                    Select2.prototype._registerSelectionEvents = function () {
                        var self = this;
                        var nonRelayEvents = ['toggle'];

                        this.selection.on('toggle', function () {
                            self.toggleDropdown();
                        });

                        this.selection.on('*', function (name, params) {
                            if ($.inArray(name, nonRelayEvents) !== -1) {
                                return;
                            }

                            self.trigger(name, params);
                        });
                    };

                    Select2.prototype._registerDropdownEvents = function () {
                        var self = this;

                        this.dropdown.on('*', function (name, params) {
                            self.trigger(name, params);
                        });
                    };

                    Select2.prototype._registerResultsEvents = function () {
                        var self = this;

                        this.results.on('*', function (name, params) {
                            self.trigger(name, params);
                        });
                    };

                    Select2.prototype._registerEvents = function () {
                        var self = this;

                        this.on('open', function () {
                            self.$container.addClass('select2-container--open');
                        });

                        this.on('close', function () {
                            self.$container.removeClass('select2-container--open');
                        });

                        this.on('enable', function () {
                            self.$container.removeClass('select2-container--disabled');
                        });

                        this.on('disable', function () {
                            self.$container.addClass('select2-container--disabled');
                        });

                        this.on('focus', function () {
                            self.$container.addClass('select2-container--focus');
                        });

                        this.on('blur', function () {
                            self.$container.removeClass('select2-container--focus');
                        });

                        this.on('query', function (params) {
                            if (!self.isOpen()) {
                                self.trigger('open');
                            }

                            this.dataAdapter.query(params, function (data) {
                                self.trigger('results:all', {
                                    data: data,
                                    query: params
                                });
                            });
                        });

                        this.on('query:append', function (params) {
                            this.dataAdapter.query(params, function (data) {
                                self.trigger('results:append', {
                                    data: data,
                                    query: params
                                });
                            });
                        });

                        this.on('keypress', function (evt) {
                            var key = evt.which;

                            if (self.isOpen()) {
                                if (key === KEYS.ENTER) {
                                    self.trigger('results:select');

                                    evt.preventDefault();
                                } else if ((key === KEYS.SPACE && evt.ctrlKey)) {
                                    self.trigger('results:toggle');

                                    evt.preventDefault();
                                } else if (key === KEYS.UP) {
                                    self.trigger('results:previous');

                                    evt.preventDefault();
                                } else if (key === KEYS.DOWN) {
                                    self.trigger('results:next');

                                    evt.preventDefault();
                                } else if (key === KEYS.ESC || key === KEYS.TAB) {
                                    self.close();

                                    evt.preventDefault();
                                }
                            } else {
                                if (key === KEYS.ENTER || key === KEYS.SPACE ||
                                        ((key === KEYS.DOWN || key === KEYS.UP) && evt.altKey)) {
                                    self.open();

                                    evt.preventDefault();
                                }
                            }
                        });
                    };

                    Select2.prototype._syncAttributes = function () {
                        this.options.set('disabled', this.$element.prop('disabled'));

                        if (this.options.get('disabled')) {
                            if (this.isOpen()) {
                                this.close();
                            }

                            this.trigger('disable');
                        } else {
                            this.trigger('enable');
                        }
                    };

                    /**
                     * Override the trigger method to automatically trigger pre-events when
                     * there are events that can be prevented.
                     */
                    Select2.prototype.trigger = function (name, args) {
                        var actualTrigger = Select2.__super__.trigger;
                        var preTriggerMap = {
                            'open': 'opening',
                            'close': 'closing',
                            'select': 'selecting',
                            'unselect': 'unselecting'
                        };

                        if (name in preTriggerMap) {
                            var preTriggerName = preTriggerMap[name];
                            var preTriggerArgs = {
                                prevented: false,
                                name: name,
                                args: args
                            };

                            actualTrigger.call(this, preTriggerName, preTriggerArgs);

                            if (preTriggerArgs.prevented) {
                                args.prevented = true;

                                return;
                            }
                        }

                        actualTrigger.call(this, name, args);
                    };

                    Select2.prototype.toggleDropdown = function () {
                        if (this.options.get('disabled')) {
                            return;
                        }

                        if (this.isOpen()) {
                            this.close();
                        } else {
                            this.open();
                        }
                    };

                    Select2.prototype.open = function () {
                        if (this.isOpen()) {
                            return;
                        }

                        this.trigger('query', {});

                        this.trigger('open');
                    };

                    Select2.prototype.close = function () {
                        if (!this.isOpen()) {
                            return;
                        }

                        this.trigger('close');
                    };

                    Select2.prototype.isOpen = function () {
                        return this.$container.hasClass('select2-container--open');
                    };

                    Select2.prototype.enable = function (args) {
                        if (this.options.get('debug') && window.console && console.warn) {
                            void 0;
                        }

                        if (args == null || args.length === 0) {
                            args = [true];
                        }

                        var disabled = !args[0];

                        this.$element.prop('disabled', disabled);
                    };

                    Select2.prototype.data = function () {
                        if (this.options.get('debug') &&
                                arguments.length > 0 && window.console && console.warn) {
                            void 0;
                        }

                        var data = [];

                        this.dataAdapter.current(function (currentData) {
                            data = currentData;
                        });

                        return data;
                    };

                    Select2.prototype.val = function (args) {
                        if (this.options.get('debug') && window.console && console.warn) {
                            void 0;
                        }

                        if (args == null || args.length === 0) {
                            return this.$element.val();
                        }

                        var newVal = args[0];

                        if ($.isArray(newVal)) {
                            newVal = $.map(newVal, function (obj) {
                                return obj.toString();
                            });
                        }

                        this.$element.val(newVal).trigger('change');
                    };

                    Select2.prototype.destroy = function () {
                        this.$container.remove();

                        if (this.$element[0].detachEvent) {
                            this.$element[0].detachEvent('onpropertychange', this._sync);
                        }

                        if (this._observer != null) {
                            this._observer.disconnect();
                            this._observer = null;
                        } else if (this.$element[0].removeEventListener) {
                            this.$element[0]
                                    .removeEventListener('DOMAttrModified', this._sync, false);
                        }

                        this._sync = null;

                        this.$element.off('.select2');
                        this.$element.attr('tabindex', this.$element.data('old-tabindex'));

                        this.$element.removeClass('select2-hidden-accessible');
                        this.$element.attr('aria-hidden', 'false');
                        this.$element.removeData('select2');

                        this.dataAdapter.destroy();
                        this.selection.destroy();
                        this.dropdown.destroy();
                        this.results.destroy();

                        this.dataAdapter = null;
                        this.selection = null;
                        this.dropdown = null;
                        this.results = null;
                    };

                    Select2.prototype.render = function () {
                        var $container = $(
                                '<span class="select2 select2-container">' +
                                '<span class="selection"></span>' +
                                '<span class="dropdown-wrapper" aria-hidden="true"></span>' +
                                '</span>'
                                );

                        $container.attr('dir', this.options.get('dir'));

                        this.$container = $container;

                        this.$container.addClass('select2-container--' + this.options.get('theme'));

                        $container.data('element', this.$element);

                        return $container;
                    };

                    return Select2;
                });

                S2.define('jquery.select2', [
                    'jquery',
                    'require',
                    './select2/core',
                    './select2/defaults'
                ], function ($, require, Select2, Defaults) {
                    // Force jQuery.mousewheel to be loaded if it hasn't already
                    require('jquery.mousewheel');

                    if ($.fn.select2 == null) {
                        // All methods that should return the element
                        var thisMethods = ['open', 'close', 'destroy'];

                        $.fn.select2 = function (options) {
                            options = options || {};

                            if (typeof options === 'object') {
                                this.each(function () {
                                    var instanceOptions = $.extend({}, options, true);

                                    var instance = new Select2($(this), instanceOptions);
                                });

                                return this;
                            } else if (typeof options === 'string') {
                                var instance = this.data('select2');

                                if (instance == null && window.console && console.error) {
                                    void 0;
                                }

                                var args = Array.prototype.slice.call(arguments, 1);

                                var ret = instance[options](args);

                                // Check if we should be returning `this`
                                if ($.inArray(options, thisMethods) > -1) {
                                    return this;
                                }

                                return ret;
                            } else {
                                throw new Error('Invalid arguments for Select2: ' + options);
                            }
                        };
                    }

                    if ($.fn.select2.defaults == null) {
                        $.fn.select2.defaults = Defaults;
                    }

                    return Select2;
                });

                S2.define('jquery.mousewheel', [
                    'jquery'
                ], function ($) {
                    // Used to shim jQuery.mousewheel for non-full builds.
                    return $;
                });

                // Return the AMD loader configuration so it can be used outside of this file
                return {
                    define: S2.define,
                    require: S2.require
                };
            }());

    // Autoload the jQuery bindings
    // We know that all of the modules exist above this, so we're safe
    var select2 = S2.require('jquery.select2');

    // Hold the AMD module references on the jQuery function that was just loaded
    // This allows Select2 to use the internal loader outside of this file, such
    // as in the language files.
    jQuery.fn.select2.amd = S2;

    // Return the Select2 instance for anyone who is importing it.
    return select2;
}));


/*!
 * Bootstrap v3.3.2 (http://getbootstrap.com)
 * Copyright 2011-2015 Twitter, Inc.
 * Licensed under MIT (https://github.com/twbs/bootstrap/blob/master/LICENSE)
 */

if (typeof jQuery === 'undefined') {
    throw new Error('Bootstrap\'s JavaScript requires jQuery')
}

+function ($) {
    'use strict';
    var version = $.fn.jquery.split(' ')[0].split('.')
    if ((version[0] < 2 && version[1] < 9) || (version[0] == 1 && version[1] == 9 && version[2] < 1)) {
        throw new Error('Bootstrap\'s JavaScript requires jQuery version 1.9.1 or higher')
    }
}(jQuery);

/* ========================================================================
 * Bootstrap: transition.js v3.3.2
 * http://getbootstrap.com/javascript/#transitions
 * ========================================================================
 * Copyright 2011-2015 Twitter, Inc.
 * Licensed under MIT (https://github.com/twbs/bootstrap/blob/master/LICENSE)
 * ======================================================================== */


+function ($) {
    'use strict';

    // CSS TRANSITION SUPPORT (Shoutout: http://www.modernizr.com/)
    // ============================================================

    function transitionEnd() {
        var el = document.createElement('bootstrap')

        var transEndEventNames = {
            WebkitTransition: 'webkitTransitionEnd',
            MozTransition: 'transitionend',
            OTransition: 'oTransitionEnd otransitionend',
            transition: 'transitionend'
        }

        for (var name in transEndEventNames) {
            if (el.style[name] !== undefined) {
                return {end: transEndEventNames[name]}
            }
        }

        return false // explicit for ie8 (  ._.)
    }

    // http://blog.alexmaccaw.com/css-transitions
    $.fn.emulateTransitionEnd = function (duration) {
        var called = false
        var $el = this
        $(this).one('bsTransitionEnd', function () {
            called = true
        })
        var callback = function () {
            if (!called)
                $($el).trigger($.support.transition.end)
        }
        setTimeout(callback, duration)
        return this
    }

    $(function () {
        $.support.transition = transitionEnd()

        if (!$.support.transition)
            return

        $.event.special.bsTransitionEnd = {
            bindType: $.support.transition.end,
            delegateType: $.support.transition.end,
            handle: function (e) {
                if ($(e.target).is(this))
                    return e.handleObj.handler.apply(this, arguments)
            }
        }
    })

}(jQuery);

/* ========================================================================
 * Bootstrap: alert.js v3.3.2
 * http://getbootstrap.com/javascript/#alerts
 * ========================================================================
 * Copyright 2011-2015 Twitter, Inc.
 * Licensed under MIT (https://github.com/twbs/bootstrap/blob/master/LICENSE)
 * ======================================================================== */


+function ($) {
    'use strict';

    // ALERT CLASS DEFINITION
    // ======================

    var dismiss = '[data-dismiss="alert"]'
    var Alert = function (el) {
        $(el).on('click', dismiss, this.close)
    }

    Alert.VERSION = '3.3.2'

    Alert.TRANSITION_DURATION = 150

    Alert.prototype.close = function (e) {
        var $this = $(this)
        var selector = $this.attr('data-target')

        if (!selector) {
            selector = $this.attr('href')
            selector = selector && selector.replace(/.*(?=#[^\s]*$)/, '') // strip for ie7
        }

        var $parent = $(selector)

        if (e)
            e.preventDefault()

        if (!$parent.length) {
            $parent = $this.closest('.alert')
        }

        $parent.trigger(e = $.Event('close.bs.alert'))

        if (e.isDefaultPrevented())
            return

        $parent.removeClass('in')

        function removeElement() {
            // detach from parent, fire event then clean up data
            $parent.detach().trigger('closed.bs.alert').remove()
        }

        $.support.transition && $parent.hasClass('fade') ?
                $parent
                .one('bsTransitionEnd', removeElement)
                .emulateTransitionEnd(Alert.TRANSITION_DURATION) :
                removeElement()
    }


    // ALERT PLUGIN DEFINITION
    // =======================

    function Plugin(option) {
        return this.each(function () {
            var $this = $(this)
            var data = $this.data('bs.alert')

            if (!data)
                $this.data('bs.alert', (data = new Alert(this)))
            if (typeof option == 'string')
                data[option].call($this)
        })
    }

    var old = $.fn.alert

    $.fn.alert = Plugin
    $.fn.alert.Constructor = Alert


    // ALERT NO CONFLICT
    // =================

    $.fn.alert.noConflict = function () {
        $.fn.alert = old
        return this
    }


    // ALERT DATA-API
    // ==============

    $(document).on('click.bs.alert.data-api', dismiss, Alert.prototype.close)

}(jQuery);

/* ========================================================================
 * Bootstrap: button.js v3.3.2
 * http://getbootstrap.com/javascript/#buttons
 * ========================================================================
 * Copyright 2011-2015 Twitter, Inc.
 * Licensed under MIT (https://github.com/twbs/bootstrap/blob/master/LICENSE)
 * ======================================================================== */


+function ($) {
    'use strict';

    // BUTTON PUBLIC CLASS DEFINITION
    // ==============================

    var Button = function (element, options) {
        this.$element = $(element)
        this.options = $.extend({}, Button.DEFAULTS, options)
        this.isLoading = false
    }

    Button.VERSION = '3.3.2'

    Button.DEFAULTS = {
        loadingText: 'loading...'
    }

    Button.prototype.setState = function (state) {
        var d = 'disabled'
        var $el = this.$element
        var val = $el.is('input') ? 'val' : 'html'
        var data = $el.data()

        state = state + 'Text'

        if (data.resetText == null)
            $el.data('resetText', $el[val]())

        // push to event loop to allow forms to submit
        setTimeout($.proxy(function () {
            $el[val](data[state] == null ? this.options[state] : data[state])

            if (state == 'loadingText') {
                this.isLoading = true
                $el.addClass(d).attr(d, d)
            } else if (this.isLoading) {
                this.isLoading = false
                $el.removeClass(d).removeAttr(d)
            }
        }, this), 0)
    }

    Button.prototype.toggle = function () {
        var changed = true
        var $parent = this.$element.closest('[data-toggle="buttons"]')

        if ($parent.length) {
            var $input = this.$element.find('input')
            if ($input.prop('type') == 'radio') {
                if ($input.prop('checked') && this.$element.hasClass('active'))
                    changed = false
                else
                    $parent.find('.active').removeClass('active')
            }
            if (changed)
                $input.prop('checked', !this.$element.hasClass('active')).trigger('change')
        } else {
            this.$element.attr('aria-pressed', !this.$element.hasClass('active'))
        }

        if (changed)
            this.$element.toggleClass('active')
    }


    // BUTTON PLUGIN DEFINITION
    // ========================

    function Plugin(option) {
        return this.each(function () {
            var $this = $(this)
            var data = $this.data('bs.button')
            var options = typeof option == 'object' && option

            if (!data)
                $this.data('bs.button', (data = new Button(this, options)))

            if (option == 'toggle')
                data.toggle()
            else if (option)
                data.setState(option)
        })
    }

    var old = $.fn.button

    $.fn.button = Plugin
    $.fn.button.Constructor = Button


    // BUTTON NO CONFLICT
    // ==================

    $.fn.button.noConflict = function () {
        $.fn.button = old
        return this
    }


    // BUTTON DATA-API
    // ===============

    $(document)
            .on('click.bs.button.data-api', '[data-toggle^="button"]', function (e) {
                var $btn = $(e.target)
                if (!$btn.hasClass('btn'))
                    $btn = $btn.closest('.btn')
                Plugin.call($btn, 'toggle')
                e.preventDefault()
            })
            .on('focus.bs.button.data-api blur.bs.button.data-api', '[data-toggle^="button"]', function (e) {
                $(e.target).closest('.btn').toggleClass('focus', /^focus(in)?$/.test(e.type))
            })

}(jQuery);

/* ========================================================================
 * Bootstrap: carousel.js v3.3.2
 * http://getbootstrap.com/javascript/#carousel
 * ========================================================================
 * Copyright 2011-2015 Twitter, Inc.
 * Licensed under MIT (https://github.com/twbs/bootstrap/blob/master/LICENSE)
 * ======================================================================== */


+function ($) {
    'use strict';

    // CAROUSEL CLASS DEFINITION
    // =========================

    var Carousel = function (element, options) {
        this.$element = $(element)
        this.$indicators = this.$element.find('.carousel-indicators')
        this.options = options
        this.paused = null
        this.sliding = null
        this.interval = null
        this.$active = null
        this.$items = null

        this.options.keyboard && this.$element.on('keydown.bs.carousel', $.proxy(this.keydown, this))

        this.options.pause == 'hover' && !('ontouchstart' in document.documentElement) && this.$element
                .on('mouseenter.bs.carousel', $.proxy(this.pause, this))
                .on('mouseleave.bs.carousel', $.proxy(this.cycle, this))
    }

    Carousel.VERSION = '3.3.2'

    Carousel.TRANSITION_DURATION = 600

    Carousel.DEFAULTS = {
        interval: 5000,
        pause: 'hover',
        wrap: true,
        keyboard: true
    }

    Carousel.prototype.keydown = function (e) {
        if (/input|textarea/i.test(e.target.tagName))
            return
        switch (e.which) {
            case 37:
                this.prev();
                break
            case 39:
                this.next();
                break
            default:
                return
        }

        e.preventDefault()
    }

    Carousel.prototype.cycle = function (e) {
        e || (this.paused = false)

        this.interval && clearInterval(this.interval)

        this.options.interval
                && !this.paused
                && (this.interval = setInterval($.proxy(this.next, this), this.options.interval))

        return this
    }

    Carousel.prototype.getItemIndex = function (item) {
        this.$items = item.parent().children('.item')
        return this.$items.index(item || this.$active)
    }

    Carousel.prototype.getItemForDirection = function (direction, active) {
        var activeIndex = this.getItemIndex(active)
        var willWrap = (direction == 'prev' && activeIndex === 0)
                || (direction == 'next' && activeIndex == (this.$items.length - 1))
        if (willWrap && !this.options.wrap)
            return active
        var delta = direction == 'prev' ? -1 : 1
        var itemIndex = (activeIndex + delta) % this.$items.length
        return this.$items.eq(itemIndex)
    }

    Carousel.prototype.to = function (pos) {
        var that = this
        var activeIndex = this.getItemIndex(this.$active = this.$element.find('.item.active'))

        if (pos > (this.$items.length - 1) || pos < 0)
            return

        if (this.sliding)
            return this.$element.one('slid.bs.carousel', function () {
                that.to(pos)
            }) // yes, "slid"
        if (activeIndex == pos)
            return this.pause().cycle()

        return this.slide(pos > activeIndex ? 'next' : 'prev', this.$items.eq(pos))
    }

    Carousel.prototype.pause = function (e) {
        e || (this.paused = true)

        if (this.$element.find('.next, .prev').length && $.support.transition) {
            this.$element.trigger($.support.transition.end)
            this.cycle(true)
        }

        this.interval = clearInterval(this.interval)

        return this
    }

    Carousel.prototype.next = function () {
        if (this.sliding)
            return
        return this.slide('next')
    }

    Carousel.prototype.prev = function () {
        if (this.sliding)
            return
        return this.slide('prev')
    }

    Carousel.prototype.slide = function (type, next) {
        var $active = this.$element.find('.item.active')
        var $next = next || this.getItemForDirection(type, $active)
        var isCycling = this.interval
        var direction = type == 'next' ? 'left' : 'right'
        var that = this

        if ($next.hasClass('active'))
            return (this.sliding = false)

        var relatedTarget = $next[0]
        var slideEvent = $.Event('slide.bs.carousel', {
            relatedTarget: relatedTarget,
            direction: direction
        })
        this.$element.trigger(slideEvent)
        if (slideEvent.isDefaultPrevented())
            return

        this.sliding = true

        isCycling && this.pause()

        if (this.$indicators.length) {
            this.$indicators.find('.active').removeClass('active')
            var $nextIndicator = $(this.$indicators.children()[this.getItemIndex($next)])
            $nextIndicator && $nextIndicator.addClass('active')
        }

        var slidEvent = $.Event('slid.bs.carousel', {relatedTarget: relatedTarget, direction: direction}) // yes, "slid"
        if ($.support.transition && this.$element.hasClass('slide')) {
            $next.addClass(type)
            $next[0].offsetWidth // force reflow
            $active.addClass(direction)
            $next.addClass(direction)
            $active
                    .one('bsTransitionEnd', function () {
                        $next.removeClass([type, direction].join(' ')).addClass('active')
                        $active.removeClass(['active', direction].join(' '))
                        that.sliding = false
                        setTimeout(function () {
                            that.$element.trigger(slidEvent)
                        }, 0)
                    })
                    .emulateTransitionEnd(Carousel.TRANSITION_DURATION)
        } else {
            $active.removeClass('active')
            $next.addClass('active')
            this.sliding = false
            this.$element.trigger(slidEvent)
        }

        isCycling && this.cycle()

        return this
    }


    // CAROUSEL PLUGIN DEFINITION
    // ==========================

    function Plugin(option) {
        return this.each(function () {
            var $this = $(this)
            var data = $this.data('bs.carousel')
            var options = $.extend({}, Carousel.DEFAULTS, $this.data(), typeof option == 'object' && option)
            var action = typeof option == 'string' ? option : options.slide

            if (!data)
                $this.data('bs.carousel', (data = new Carousel(this, options)))
            if (typeof option == 'number')
                data.to(option)
            else if (action)
                data[action]()
            else if (options.interval)
                data.pause().cycle()
        })
    }

    var old = $.fn.carousel

    $.fn.carousel = Plugin
    $.fn.carousel.Constructor = Carousel


    // CAROUSEL NO CONFLICT
    // ====================

    $.fn.carousel.noConflict = function () {
        $.fn.carousel = old
        return this
    }


    // CAROUSEL DATA-API
    // =================

    var clickHandler = function (e) {
        var href
        var $this = $(this)
        var $target = $($this.attr('data-target') || (href = $this.attr('href')) && href.replace(/.*(?=#[^\s]+$)/, '')) // strip for ie7
        if (!$target.hasClass('carousel'))
            return
        var options = $.extend({}, $target.data(), $this.data())
        var slideIndex = $this.attr('data-slide-to')
        if (slideIndex)
            options.interval = false

        Plugin.call($target, options)

        if (slideIndex) {
            $target.data('bs.carousel').to(slideIndex)
        }

        e.preventDefault()
    }

    $(document)
            .on('click.bs.carousel.data-api', '[data-slide]', clickHandler)
            .on('click.bs.carousel.data-api', '[data-slide-to]', clickHandler)

    $(window).on('load', function () {
        $('[data-ride="carousel"]').each(function () {
            var $carousel = $(this)
            Plugin.call($carousel, $carousel.data())
        })
    })

}(jQuery);

/* ========================================================================
 * Bootstrap: collapse.js v3.3.2
 * http://getbootstrap.com/javascript/#collapse
 * ========================================================================
 * Copyright 2011-2015 Twitter, Inc.
 * Licensed under MIT (https://github.com/twbs/bootstrap/blob/master/LICENSE)
 * ======================================================================== */


+function ($) {
    'use strict';

    // COLLAPSE PUBLIC CLASS DEFINITION
    // ================================

    var Collapse = function (element, options) {
        this.$element = $(element)
        this.options = $.extend({}, Collapse.DEFAULTS, options)
        this.$trigger = $('[data-toggle="collapse"][href="#' + element.id + '"],' +
                '[data-toggle="collapse"][data-target="#' + element.id + '"]')
        this.transitioning = null

        if (this.options.parent) {
            this.$parent = this.getParent()
        } else {
            this.addAriaAndCollapsedClass(this.$element, this.$trigger)
        }

        if (this.options.toggle)
            this.toggle()
    }

    Collapse.VERSION = '3.3.2'

    Collapse.TRANSITION_DURATION = 350

    Collapse.DEFAULTS = {
        toggle: true
    }

    Collapse.prototype.dimension = function () {
        var hasWidth = this.$element.hasClass('width')
        return hasWidth ? 'width' : 'height'
    }

    Collapse.prototype.show = function () {
        if (this.transitioning || this.$element.hasClass('in'))
            return

        var activesData
        var actives = this.$parent && this.$parent.children('.panel').children('.in, .collapsing')

        if (actives && actives.length) {
            activesData = actives.data('bs.collapse')
            if (activesData && activesData.transitioning)
                return
        }

        var startEvent = $.Event('show.bs.collapse')
        this.$element.trigger(startEvent)
        if (startEvent.isDefaultPrevented())
            return

        if (actives && actives.length) {
            Plugin.call(actives, 'hide')
            activesData || actives.data('bs.collapse', null)
        }

        var dimension = this.dimension()

        this.$element
                .removeClass('collapse')
                .addClass('collapsing')[dimension](0)
                .attr('aria-expanded', true)

        this.$trigger
                .removeClass('collapsed')
                .attr('aria-expanded', true)

        this.transitioning = 1

        var complete = function () {
            this.$element
                    .removeClass('collapsing')
                    .addClass('collapse in')[dimension]('')
            this.transitioning = 0
            this.$element
                    .trigger('shown.bs.collapse')
        }

        if (!$.support.transition)
            return complete.call(this)

        var scrollSize = $.camelCase(['scroll', dimension].join('-'))

        this.$element
                .one('bsTransitionEnd', $.proxy(complete, this))
                .emulateTransitionEnd(Collapse.TRANSITION_DURATION)[dimension](this.$element[0][scrollSize])
    }

    Collapse.prototype.hide = function () {
        if (this.transitioning || !this.$element.hasClass('in'))
            return

        var startEvent = $.Event('hide.bs.collapse')
        this.$element.trigger(startEvent)
        if (startEvent.isDefaultPrevented())
            return

        var dimension = this.dimension()

        this.$element[dimension](this.$element[dimension]())[0].offsetHeight

        this.$element
                .addClass('collapsing')
                .removeClass('collapse in')
                .attr('aria-expanded', false)

        this.$trigger
                .addClass('collapsed')
                .attr('aria-expanded', false)

        this.transitioning = 1

        var complete = function () {
            this.transitioning = 0
            this.$element
                    .removeClass('collapsing')
                    .addClass('collapse')
                    .trigger('hidden.bs.collapse')
        }

        if (!$.support.transition)
            return complete.call(this)

        this.$element
                [dimension](0)
                .one('bsTransitionEnd', $.proxy(complete, this))
                .emulateTransitionEnd(Collapse.TRANSITION_DURATION)
    }

    Collapse.prototype.toggle = function () {
        this[this.$element.hasClass('in') ? 'hide' : 'show']()
    }

    Collapse.prototype.getParent = function () {
        return $(this.options.parent)
                .find('[data-toggle="collapse"][data-parent="' + this.options.parent + '"]')
                .each($.proxy(function (i, element) {
                    var $element = $(element)
                    this.addAriaAndCollapsedClass(getTargetFromTrigger($element), $element)
                }, this))
                .end()
    }

    Collapse.prototype.addAriaAndCollapsedClass = function ($element, $trigger) {
        var isOpen = $element.hasClass('in')

        $element.attr('aria-expanded', isOpen)
        $trigger
                .toggleClass('collapsed', !isOpen)
                .attr('aria-expanded', isOpen)
    }

    function getTargetFromTrigger($trigger) {
        var href
        var target = $trigger.attr('data-target')
                || (href = $trigger.attr('href')) && href.replace(/.*(?=#[^\s]+$)/, '') // strip for ie7

        return $(target)
    }


    // COLLAPSE PLUGIN DEFINITION
    // ==========================

    function Plugin(option) {
        return this.each(function () {
            var $this = $(this)
            var data = $this.data('bs.collapse')
            var options = $.extend({}, Collapse.DEFAULTS, $this.data(), typeof option == 'object' && option)

            if (!data && options.toggle && /show|hide/.test(option))
                options.toggle = false
            if (!data)
                $this.data('bs.collapse', (data = new Collapse(this, options)))
            if (typeof option == 'string')
                data[option]()
        })
    }

    var old = $.fn.collapse

    $.fn.collapse = Plugin
    $.fn.collapse.Constructor = Collapse


    // COLLAPSE NO CONFLICT
    // ====================

    $.fn.collapse.noConflict = function () {
        $.fn.collapse = old
        return this
    }


    // COLLAPSE DATA-API
    // =================

    $(document).on('click.bs.collapse.data-api', '[data-toggle="collapse"]', function (e) {
        var $this = $(this)

        if (!$this.attr('data-target'))
            e.preventDefault()

        var $target = getTargetFromTrigger($this)
        var data = $target.data('bs.collapse')
        var option = data ? 'toggle' : $this.data()

        Plugin.call($target, option)
    })

}(jQuery);

/* ========================================================================
 * Bootstrap: dropdown.js v3.3.2
 * http://getbootstrap.com/javascript/#dropdowns
 * ========================================================================
 * Copyright 2011-2015 Twitter, Inc.
 * Licensed under MIT (https://github.com/twbs/bootstrap/blob/master/LICENSE)
 * ======================================================================== */


+function ($) {
    'use strict';

    // DROPDOWN CLASS DEFINITION
    // =========================

    var backdrop = '.dropdown-backdrop'
    var toggle = '[data-toggle="dropdown"]'
    var Dropdown = function (element) {
        $(element).on('click.bs.dropdown', this.toggle)
    }

    Dropdown.VERSION = '3.3.2'

    Dropdown.prototype.toggle = function (e) {
        var $this = $(this)

        if ($this.is('.disabled, :disabled'))
            return

        var $parent = getParent($this)
        var isActive = $parent.hasClass('open')

        clearMenus()

        if (!isActive) {
            if ('ontouchstart' in document.documentElement && !$parent.closest('.navbar-nav').length) {
                // if mobile we use a backdrop because click events don't delegate
                $('<div class="dropdown-backdrop"/>').insertAfter($(this)).on('click', clearMenus)
            }

            var relatedTarget = {relatedTarget: this}
            $parent.trigger(e = $.Event('show.bs.dropdown', relatedTarget))

            if (e.isDefaultPrevented())
                return

            $this
                    .trigger('focus')
                    .attr('aria-expanded', 'true')

            $parent
                    .toggleClass('open')
                    .trigger('shown.bs.dropdown', relatedTarget)
        }

        return false
    }

    Dropdown.prototype.keydown = function (e) {
        if (!/(38|40|27|32)/.test(e.which) || /input|textarea/i.test(e.target.tagName))
            return

        var $this = $(this)

        e.preventDefault()
        e.stopPropagation()

        if ($this.is('.disabled, :disabled'))
            return

        var $parent = getParent($this)
        var isActive = $parent.hasClass('open')

        if ((!isActive && e.which != 27) || (isActive && e.which == 27)) {
            if (e.which == 27)
                $parent.find(toggle).trigger('focus')
            return $this.trigger('click')
        }

        var desc = ' li:not(.disabled):visible a'
        var $items = $parent.find('[role="menu"]' + desc + ', [role="listbox"]' + desc)

        if (!$items.length)
            return

        var index = $items.index(e.target)

        if (e.which == 38 && index > 0)
            index--                        // up
        if (e.which == 40 && index < $items.length - 1)
            index++                        // down
        if (!~index)
            index = 0

        $items.eq(index).trigger('focus')
    }

    function clearMenus(e) {
        if (e && e.which === 3)
            return
        $(backdrop).remove()
        $(toggle).each(function () {
            var $this = $(this)
            var $parent = getParent($this)
            var relatedTarget = {relatedTarget: this}

            if (!$parent.hasClass('open'))
                return

            $parent.trigger(e = $.Event('hide.bs.dropdown', relatedTarget))

            if (e.isDefaultPrevented())
                return

            $this.attr('aria-expanded', 'false')
            $parent.removeClass('open').trigger('hidden.bs.dropdown', relatedTarget)
        })
    }

    function getParent($this) {
        var selector = $this.attr('data-target')

        if (!selector) {
            selector = $this.attr('href')
            selector = selector && /#[A-Za-z]/.test(selector) && selector.replace(/.*(?=#[^\s]*$)/, '') // strip for ie7
        }

        var $parent = selector && $(selector)

        return $parent && $parent.length ? $parent : $this.parent()
    }


    // DROPDOWN PLUGIN DEFINITION
    // ==========================

    function Plugin(option) {
        return this.each(function () {
            var $this = $(this)
            var data = $this.data('bs.dropdown')

            if (!data)
                $this.data('bs.dropdown', (data = new Dropdown(this)))
            if (typeof option == 'string')
                data[option].call($this)
        })
    }

    var old = $.fn.dropdown

    $.fn.dropdown = Plugin
    $.fn.dropdown.Constructor = Dropdown


    // DROPDOWN NO CONFLICT
    // ====================

    $.fn.dropdown.noConflict = function () {
        $.fn.dropdown = old
        return this
    }


    // APPLY TO STANDARD DROPDOWN ELEMENTS
    // ===================================

    $(document)
            .on('click.bs.dropdown.data-api', clearMenus)
            .on('click.bs.dropdown.data-api', '.dropdown form', function (e) {
                e.stopPropagation()
            })
            .on('click.bs.dropdown.data-api', toggle, Dropdown.prototype.toggle)
            .on('keydown.bs.dropdown.data-api', toggle, Dropdown.prototype.keydown)
            .on('keydown.bs.dropdown.data-api', '[role="menu"]', Dropdown.prototype.keydown)
            .on('keydown.bs.dropdown.data-api', '[role="listbox"]', Dropdown.prototype.keydown)

}(jQuery);

/* ========================================================================
 * Bootstrap: modal.js v3.3.2
 * http://getbootstrap.com/javascript/#modals
 * ========================================================================
 * Copyright 2011-2015 Twitter, Inc.
 * Licensed under MIT (https://github.com/twbs/bootstrap/blob/master/LICENSE)
 * ======================================================================== */


+function ($) {
    'use strict';

    // MODAL CLASS DEFINITION
    // ======================

    var Modal = function (element, options) {
        this.options = options
        this.$body = $(document.body)
        this.$element = $(element)
        this.$dialog = this.$element.find('.modal-dialog')
        this.$backdrop = null
        this.isShown = null
        this.originalBodyPad = null
        this.scrollbarWidth = 0
        this.ignoreBackdropClick = false

        if (this.options.remote) {
            this.$element
                    .find('.modal-content')
                    .load(this.options.remote, $.proxy(function () {
                        this.$element.trigger('loaded.bs.modal')
                    }, this))
        }
    }

    Modal.VERSION = '3.3.2'

    Modal.TRANSITION_DURATION = 300
    Modal.BACKDROP_TRANSITION_DURATION = 150

    Modal.DEFAULTS = {
        backdrop: true,
        keyboard: true,
        show: true
    }

    Modal.prototype.toggle = function (_relatedTarget) {
        return this.isShown ? this.hide() : this.show(_relatedTarget)
    }

    Modal.prototype.show = function (_relatedTarget) {
        var that = this
        var e = $.Event('show.bs.modal', {relatedTarget: _relatedTarget})

        this.$element.trigger(e)

        if (this.isShown || e.isDefaultPrevented())
            return

        this.isShown = true

        this.checkScrollbar()
        this.setScrollbar()
        this.$body.addClass('modal-open')

        this.escape()
        this.resize()

        this.$element.on('click.dismiss.bs.modal', '[data-dismiss="modal"]', $.proxy(this.hide, this))

        this.$dialog.on('mousedown.dismiss.bs.modal', function () {
            that.$element.one('mouseup.dismiss.bs.modal', function (e) {
                if ($(e.target).is(that.$element))
                    that.ignoreBackdropClick = true
            })
        })

        this.backdrop(function () {
            var transition = $.support.transition && that.$element.hasClass('fade')

            if (!that.$element.parent().length) {
                that.$element.appendTo(that.$body) // don't move modals dom position
            }

            that.$element
                    .show()
                    .scrollTop(0)

            that.adjustDialog()

            if (transition) {
                that.$element[0].offsetWidth // force reflow
            }

            that.$element
                    .addClass('in')
                    .attr('aria-hidden', false)

            that.enforceFocus()

            var e = $.Event('shown.bs.modal', {relatedTarget: _relatedTarget})

            transition ?
                    that.$dialog // wait for modal to slide in
                    .one('bsTransitionEnd', function () {
                        that.$element.trigger('focus').trigger(e)
                    })
                    .emulateTransitionEnd(Modal.TRANSITION_DURATION) :
                    that.$element.trigger('focus').trigger(e)
        })
    }

    Modal.prototype.hide = function (e) {
        if (e)
            e.preventDefault()

        e = $.Event('hide.bs.modal')

        this.$element.trigger(e)

        if (!this.isShown || e.isDefaultPrevented())
            return

        this.isShown = false

        this.escape()
        this.resize()

        $(document).off('focusin.bs.modal')

        this.$element
                .removeClass('in')
                .attr('aria-hidden', true)
                .off('click.dismiss.bs.modal')
                .off('mouseup.dismiss.bs.modal')

        this.$dialog.off('mousedown.dismiss.bs.modal')

        $.support.transition && this.$element.hasClass('fade') ?
                this.$element
                .one('bsTransitionEnd', $.proxy(this.hideModal, this))
                .emulateTransitionEnd(Modal.TRANSITION_DURATION) :
                this.hideModal()
    }

    Modal.prototype.enforceFocus = function () {
        $(document)
                .off('focusin.bs.modal') // guard against infinite focus loop
                .on('focusin.bs.modal', $.proxy(function (e) {
                    if (this.$element[0] !== e.target && !this.$element.has(e.target).length) {
                        this.$element.trigger('focus')
                    }
                }, this))
    }

    Modal.prototype.escape = function () {
        if (this.isShown && this.options.keyboard) {
            this.$element.on('keydown.dismiss.bs.modal', $.proxy(function (e) {
                e.which == 27 && this.hide()
            }, this))
        } else if (!this.isShown) {
            this.$element.off('keydown.dismiss.bs.modal')
        }
    }

    Modal.prototype.resize = function () {
        if (this.isShown) {
            $(window).on('resize.bs.modal', $.proxy(this.handleUpdate, this))
        } else {
            $(window).off('resize.bs.modal')
        }
    }

    Modal.prototype.hideModal = function () {
        var that = this
        this.$element.hide()
        this.backdrop(function () {
            that.$body.removeClass('modal-open')
            that.resetAdjustments()
            that.resetScrollbar()
            that.$element.trigger('hidden.bs.modal')
        })
    }

    Modal.prototype.removeBackdrop = function () {
        this.$backdrop && this.$backdrop.remove()
        this.$backdrop = null
    }

    Modal.prototype.backdrop = function (callback) {
        var that = this
        var animate = this.$element.hasClass('fade') ? 'fade' : ''

        if (this.isShown && this.options.backdrop) {
            var doAnimate = $.support.transition && animate

            this.$backdrop = $('<div class="modal-backdrop ' + animate + '" />')
                    .appendTo(this.$body)

            this.$element.on('click.dismiss.bs.modal', $.proxy(function (e) {
                if (this.ignoreBackdropClick) {
                    this.ignoreBackdropClick = false
                    return
                }
                if (e.target !== e.currentTarget)
                    return
                this.options.backdrop == 'static'
                        ? this.$element[0].focus()
                        : this.hide()
            }, this))

            if (doAnimate)
                this.$backdrop[0].offsetWidth // force reflow

            this.$backdrop.addClass('in')

            if (!callback)
                return

            doAnimate ?
                    this.$backdrop
                    .one('bsTransitionEnd', callback)
                    .emulateTransitionEnd(Modal.BACKDROP_TRANSITION_DURATION) :
                    callback()

        } else if (!this.isShown && this.$backdrop) {
            this.$backdrop.removeClass('in')

            var callbackRemove = function () {
                that.removeBackdrop()
                callback && callback()
            }
            $.support.transition && this.$element.hasClass('fade') ?
                    this.$backdrop
                    .one('bsTransitionEnd', callbackRemove)
                    .emulateTransitionEnd(Modal.BACKDROP_TRANSITION_DURATION) :
                    callbackRemove()

        } else if (callback) {
            callback()
        }
    }

    // these following methods are used to handle overflowing modals

    Modal.prototype.handleUpdate = function () {
        this.adjustDialog()
    }

    Modal.prototype.adjustDialog = function () {
        var modalIsOverflowing = this.$element[0].scrollHeight > document.documentElement.clientHeight

        this.$element.css({
            paddingLeft: !this.bodyIsOverflowing && modalIsOverflowing ? this.scrollbarWidth : '',
            paddingRight: this.bodyIsOverflowing && !modalIsOverflowing ? this.scrollbarWidth : ''
        })
    }

    Modal.prototype.resetAdjustments = function () {
        this.$element.css({
            paddingLeft: '',
            paddingRight: ''
        })
    }

    Modal.prototype.checkScrollbar = function () {
        var fullWindowWidth = window.innerWidth
        if (!fullWindowWidth) { // workaround for missing window.innerWidth in IE8
            var documentElementRect = document.documentElement.getBoundingClientRect()
            fullWindowWidth = documentElementRect.right - Math.abs(documentElementRect.left)
        }
        this.bodyIsOverflowing = document.body.clientWidth < fullWindowWidth
        this.scrollbarWidth = this.measureScrollbar()
    }

    Modal.prototype.setScrollbar = function () {
        var bodyPad = parseInt((this.$body.css('padding-right') || 0), 10)
        this.originalBodyPad = document.body.style.paddingRight || ''
        if (this.bodyIsOverflowing)
            this.$body.css('padding-right', bodyPad + this.scrollbarWidth)
    }

    Modal.prototype.resetScrollbar = function () {
        this.$body.css('padding-right', this.originalBodyPad)
    }

    Modal.prototype.measureScrollbar = function () { // thx walsh
        var scrollDiv = document.createElement('div')
        scrollDiv.className = 'modal-scrollbar-measure'
        this.$body.append(scrollDiv)
        var scrollbarWidth = scrollDiv.offsetWidth - scrollDiv.clientWidth
        this.$body[0].removeChild(scrollDiv)
        return scrollbarWidth
    }


    // MODAL PLUGIN DEFINITION
    // =======================

    function Plugin(option, _relatedTarget) {
        return this.each(function () {
            var $this = $(this)
            var data = $this.data('bs.modal')
            var options = $.extend({}, Modal.DEFAULTS, $this.data(), typeof option == 'object' && option)

            if (!data)
                $this.data('bs.modal', (data = new Modal(this, options)))
            if (typeof option == 'string')
                data[option](_relatedTarget)
            else if (options.show)
                data.show(_relatedTarget)
        })
    }

    var old = $.fn.modal

    $.fn.modal = Plugin
    $.fn.modal.Constructor = Modal


    // MODAL NO CONFLICT
    // =================

    $.fn.modal.noConflict = function () {
        $.fn.modal = old
        return this
    }


    // MODAL DATA-API
    // ==============

    $(document).on('click.bs.modal.data-api', '[data-toggle="modal"]', function (e) {
        var $this = $(this)
        var href = $this.attr('href')
        var $target = $($this.attr('data-target') || (href && href.replace(/.*(?=#[^\s]+$)/, ''))) // strip for ie7
        var option = $target.data('bs.modal') ? 'toggle' : $.extend({remote: !/#/.test(href) && href}, $target.data(), $this.data())

        if ($this.is('a'))
            e.preventDefault()

        $target.one('show.bs.modal', function (showEvent) {
            if (showEvent.isDefaultPrevented())
                return // only register focus restorer if modal will actually get shown
            $target.one('hidden.bs.modal', function () {
                $this.is(':visible') && $this.trigger('focus')
            })
        })
        Plugin.call($target, option, this)
    })

}(jQuery);

/* ========================================================================
 * Bootstrap: tooltip.js v3.3.2
 * http://getbootstrap.com/javascript/#tooltip
 * Inspired by the original jQuery.tipsy by Jason Frame
 * ========================================================================
 * Copyright 2011-2015 Twitter, Inc.
 * Licensed under MIT (https://github.com/twbs/bootstrap/blob/master/LICENSE)
 * ======================================================================== */


+function ($) {
    'use strict';

    // TOOLTIP PUBLIC CLASS DEFINITION
    // ===============================

    var Tooltip = function (element, options) {
        this.type = null
        this.options = null
        this.enabled = null
        this.timeout = null
        this.hoverState = null
        this.$element = null

        this.init('tooltip', element, options)
    }

    Tooltip.VERSION = '3.3.2'

    Tooltip.TRANSITION_DURATION = 150

    Tooltip.DEFAULTS = {
        animation: true,
        placement: 'top',
        selector: false,
        template: '<div class="tooltip" role="tooltip"><div class="tooltip-arrow"></div><div class="tooltip-inner"></div></div>',
        trigger: 'hover focus',
        title: '',
        delay: 0,
        html: false,
        container: false,
        viewport: {
            selector: 'body',
            padding: 0
        }
    }

    Tooltip.prototype.init = function (type, element, options) {
        this.enabled = true
        this.type = type
        this.$element = $(element)
        this.options = this.getOptions(options)
        this.$viewport = this.options.viewport && $(this.options.viewport.selector || this.options.viewport)

        if (this.$element[0] instanceof document.constructor && !this.options.selector) {
            throw new Error('`selector` option must be specified when initializing ' + this.type + ' on the window.document object!')
        }

        var triggers = this.options.trigger.split(' ')

        for (var i = triggers.length; i--; ) {
            var trigger = triggers[i]

            if (trigger == 'click') {
                this.$element.on('click.' + this.type, this.options.selector, $.proxy(this.toggle, this))
            } else if (trigger != 'manual') {
                var eventIn = trigger == 'hover' ? 'mouseenter' : 'focusin'
                var eventOut = trigger == 'hover' ? 'mouseleave' : 'focusout'

                this.$element.on(eventIn + '.' + this.type, this.options.selector, $.proxy(this.enter, this))
                this.$element.on(eventOut + '.' + this.type, this.options.selector, $.proxy(this.leave, this))
            }
        }

        this.options.selector ?
                (this._options = $.extend({}, this.options, {trigger: 'manual', selector: ''})) :
                this.fixTitle()
    }

    Tooltip.prototype.getDefaults = function () {
        return Tooltip.DEFAULTS
    }

    Tooltip.prototype.getOptions = function (options) {
        options = $.extend({}, this.getDefaults(), this.$element.data(), options)

        if (options.delay && typeof options.delay == 'number') {
            options.delay = {
                show: options.delay,
                hide: options.delay
            }
        }

        return options
    }

    Tooltip.prototype.getDelegateOptions = function () {
        var options = {}
        var defaults = this.getDefaults()

        this._options && $.each(this._options, function (key, value) {
            if (defaults[key] != value)
                options[key] = value
        })

        return options
    }

    Tooltip.prototype.enter = function (obj) {
        var self = obj instanceof this.constructor ?
                obj : $(obj.currentTarget).data('bs.' + this.type)

        if (self && self.$tip && self.$tip.is(':visible')) {
            self.hoverState = 'in'
            return
        }

        if (!self) {
            self = new this.constructor(obj.currentTarget, this.getDelegateOptions())
            $(obj.currentTarget).data('bs.' + this.type, self)
        }

        clearTimeout(self.timeout)

        self.hoverState = 'in'

        if (!self.options.delay || !self.options.delay.show)
            return self.show()

        self.timeout = setTimeout(function () {
            if (self.hoverState == 'in')
                self.show()
        }, self.options.delay.show)
    }

    Tooltip.prototype.leave = function (obj) {
        var self = obj instanceof this.constructor ?
                obj : $(obj.currentTarget).data('bs.' + this.type)

        if (!self) {
            self = new this.constructor(obj.currentTarget, this.getDelegateOptions())
            $(obj.currentTarget).data('bs.' + this.type, self)
        }

        clearTimeout(self.timeout)

        self.hoverState = 'out'

        if (!self.options.delay || !self.options.delay.hide)
            return self.hide()

        self.timeout = setTimeout(function () {
            if (self.hoverState == 'out')
                self.hide()
        }, self.options.delay.hide)
    }

    Tooltip.prototype.show = function () {
        var e = $.Event('show.bs.' + this.type)

        if (this.hasContent() && this.enabled) {
            this.$element.trigger(e)

            var inDom = $.contains(this.$element[0].ownerDocument.documentElement, this.$element[0])
            if (e.isDefaultPrevented() || !inDom)
                return
            var that = this

            var $tip = this.tip()

            var tipId = this.getUID(this.type)

            this.setContent()
            $tip.attr('id', tipId)
            this.$element.attr('aria-describedby', tipId)

            if (this.options.animation)
                $tip.addClass('fade')

            var placement = typeof this.options.placement == 'function' ?
                    this.options.placement.call(this, $tip[0], this.$element[0]) :
                    this.options.placement

            var autoToken = /\s?auto?\s?/i
            var autoPlace = autoToken.test(placement)
            if (autoPlace)
                placement = placement.replace(autoToken, '') || 'top'

            $tip
                    .detach()
                    .css({top: 0, left: 0, display: 'block'})
                    .addClass(placement)
                    .data('bs.' + this.type, this)

            this.options.container ? $tip.appendTo(this.options.container) : $tip.insertAfter(this.$element)

            var pos = this.getPosition()
            var actualWidth = $tip[0].offsetWidth
            var actualHeight = $tip[0].offsetHeight

            if (autoPlace) {
                var orgPlacement = placement
                var $container = this.options.container ? $(this.options.container) : this.$element.parent()
                var containerDim = this.getPosition($container)

                placement = placement == 'bottom' && pos.bottom + actualHeight > containerDim.bottom ? 'top' :
                        placement == 'top' && pos.top - actualHeight < containerDim.top ? 'bottom' :
                        placement == 'right' && pos.right + actualWidth > containerDim.width ? 'left' :
                        placement == 'left' && pos.left - actualWidth < containerDim.left ? 'right' :
                        placement

                $tip
                        .removeClass(orgPlacement)
                        .addClass(placement)
            }

            var calculatedOffset = this.getCalculatedOffset(placement, pos, actualWidth, actualHeight)

            this.applyPlacement(calculatedOffset, placement)

            var complete = function () {
                var prevHoverState = that.hoverState
                that.$element.trigger('shown.bs.' + that.type)
                that.hoverState = null

                if (prevHoverState == 'out')
                    that.leave(that)
            }

            $.support.transition && this.$tip.hasClass('fade') ?
                    $tip
                    .one('bsTransitionEnd', complete)
                    .emulateTransitionEnd(Tooltip.TRANSITION_DURATION) :
                    complete()
        }
    }

    Tooltip.prototype.applyPlacement = function (offset, placement) {
        var $tip = this.tip()
        var width = $tip[0].offsetWidth
        var height = $tip[0].offsetHeight

        // manually read margins because getBoundingClientRect includes difference
        var marginTop = parseInt($tip.css('margin-top'), 10)
        var marginLeft = parseInt($tip.css('margin-left'), 10)

        // we must check for NaN for ie 8/9
        if (isNaN(marginTop))
            marginTop = 0
        if (isNaN(marginLeft))
            marginLeft = 0

        offset.top = offset.top + marginTop
        offset.left = offset.left + marginLeft

        // $.fn.offset doesn't round pixel values
        // so we use setOffset directly with our own function B-0
        $.offset.setOffset($tip[0], $.extend({
            using: function (props) {
                $tip.css({
                    top: Math.round(props.top),
                    left: Math.round(props.left)
                })
            }
        }, offset), 0)

        $tip.addClass('in')

        // check to see if placing tip in new offset caused the tip to resize itself
        var actualWidth = $tip[0].offsetWidth
        var actualHeight = $tip[0].offsetHeight

        if (placement == 'top' && actualHeight != height) {
            offset.top = offset.top + height - actualHeight
        }

        var delta = this.getViewportAdjustedDelta(placement, offset, actualWidth, actualHeight)

        if (delta.left)
            offset.left += delta.left
        else
            offset.top += delta.top

        var isVertical = /top|bottom/.test(placement)
        var arrowDelta = isVertical ? delta.left * 2 - width + actualWidth : delta.top * 2 - height + actualHeight
        var arrowOffsetPosition = isVertical ? 'offsetWidth' : 'offsetHeight'

        $tip.offset(offset)
        this.replaceArrow(arrowDelta, $tip[0][arrowOffsetPosition], isVertical)
    }

    Tooltip.prototype.replaceArrow = function (delta, dimension, isVertical) {
        this.arrow()
                .css(isVertical ? 'left' : 'top', 50 * (1 - delta / dimension) + '%')
                .css(isVertical ? 'top' : 'left', '')
    }

    Tooltip.prototype.setContent = function () {
        var $tip = this.tip()
        var title = this.getTitle()

        $tip.find('.tooltip-inner')[this.options.html ? 'html' : 'text'](title)
        $tip.removeClass('fade in top bottom left right')
    }

    Tooltip.prototype.hide = function (callback) {
        var that = this
        var $tip = $(this.$tip)
        var e = $.Event('hide.bs.' + this.type)

        function complete() {
            if (that.hoverState != 'in')
                $tip.detach()
            that.$element
                    .removeAttr('aria-describedby')
                    .trigger('hidden.bs.' + that.type)
            callback && callback()
        }

        this.$element.trigger(e)

        if (e.isDefaultPrevented())
            return

        $tip.removeClass('in')

        $.support.transition && $tip.hasClass('fade') ?
                $tip
                .one('bsTransitionEnd', complete)
                .emulateTransitionEnd(Tooltip.TRANSITION_DURATION) :
                complete()

        this.hoverState = null

        return this
    }

    Tooltip.prototype.fixTitle = function () {
        var $e = this.$element
        if ($e.attr('title') || typeof ($e.attr('data-original-title')) != 'string') {
            $e.attr('data-original-title', $e.attr('title') || '').attr('title', '')
        }
    }

    Tooltip.prototype.hasContent = function () {
        return this.getTitle()
    }

    Tooltip.prototype.getPosition = function ($element) {
        $element = $element || this.$element

        var el = $element[0]
        var isBody = el.tagName == 'BODY'

        var elRect = el.getBoundingClientRect()
        if (elRect.width == null) {
            // width and height are missing in IE8, so compute them manually; see https://github.com/twbs/bootstrap/issues/14093
            elRect = $.extend({}, elRect, {width: elRect.right - elRect.left, height: elRect.bottom - elRect.top})
        }
        var elOffset = isBody ? {top: 0, left: 0} : $element.offset()
        var scroll = {scroll: isBody ? document.documentElement.scrollTop || document.body.scrollTop : $element.scrollTop()}
        var outerDims = isBody ? {width: $(window).width(), height: $(window).height()} : null

        return $.extend({}, elRect, scroll, outerDims, elOffset)
    }

    Tooltip.prototype.getCalculatedOffset = function (placement, pos, actualWidth, actualHeight) {
        return placement == 'bottom' ? {top: pos.top + pos.height, left: pos.left + pos.width / 2 - actualWidth / 2} :
                placement == 'top' ? {top: pos.top - actualHeight, left: pos.left + pos.width / 2 - actualWidth / 2} :
                placement == 'left' ? {top: pos.top + pos.height / 2 - actualHeight / 2, left: pos.left - actualWidth} :
                /* placement == 'right' */ {top: pos.top + pos.height / 2 - actualHeight / 2, left: pos.left + pos.width}

    }

    Tooltip.prototype.getViewportAdjustedDelta = function (placement, pos, actualWidth, actualHeight) {
        var delta = {top: 0, left: 0}
        if (!this.$viewport)
            return delta

        var viewportPadding = this.options.viewport && this.options.viewport.padding || 0
        var viewportDimensions = this.getPosition(this.$viewport)

        if (/right|left/.test(placement)) {
            var topEdgeOffset = pos.top - viewportPadding - viewportDimensions.scroll
            var bottomEdgeOffset = pos.top + viewportPadding - viewportDimensions.scroll + actualHeight
            if (topEdgeOffset < viewportDimensions.top) { // top overflow
                delta.top = viewportDimensions.top - topEdgeOffset
            } else if (bottomEdgeOffset > viewportDimensions.top + viewportDimensions.height) { // bottom overflow
                delta.top = viewportDimensions.top + viewportDimensions.height - bottomEdgeOffset
            }
        } else {
            var leftEdgeOffset = pos.left - viewportPadding
            var rightEdgeOffset = pos.left + viewportPadding + actualWidth
            if (leftEdgeOffset < viewportDimensions.left) { // left overflow
                delta.left = viewportDimensions.left - leftEdgeOffset
            } else if (rightEdgeOffset > viewportDimensions.width) { // right overflow
                delta.left = viewportDimensions.left + viewportDimensions.width - rightEdgeOffset
            }
        }

        return delta
    }

    Tooltip.prototype.getTitle = function () {
        var title
        var $e = this.$element
        var o = this.options

        title = $e.attr('data-original-title')
                || (typeof o.title == 'function' ? o.title.call($e[0]) : o.title)

        return title
    }

    Tooltip.prototype.getUID = function (prefix) {
        do
            prefix += ~~(Math.random() * 1000000)
        while (document.getElementById(prefix))
        return prefix
    }

    Tooltip.prototype.tip = function () {
        return (this.$tip = this.$tip || $(this.options.template))
    }

    Tooltip.prototype.arrow = function () {
        return (this.$arrow = this.$arrow || this.tip().find('.tooltip-arrow'))
    }

    Tooltip.prototype.enable = function () {
        this.enabled = true
    }

    Tooltip.prototype.disable = function () {
        this.enabled = false
    }

    Tooltip.prototype.toggleEnabled = function () {
        this.enabled = !this.enabled
    }

    Tooltip.prototype.toggle = function (e) {
        var self = this
        if (e) {
            self = $(e.currentTarget).data('bs.' + this.type)
            if (!self) {
                self = new this.constructor(e.currentTarget, this.getDelegateOptions())
                $(e.currentTarget).data('bs.' + this.type, self)
            }
        }

        self.tip().hasClass('in') ? self.leave(self) : self.enter(self)
    }

    Tooltip.prototype.destroy = function () {
        var that = this
        clearTimeout(this.timeout)
        this.hide(function () {
            that.$element.off('.' + that.type).removeData('bs.' + that.type)
        })
    }


    // TOOLTIP PLUGIN DEFINITION
    // =========================

    function Plugin(option) {
        return this.each(function () {
            var $this = $(this)
            var data = $this.data('bs.tooltip')
            var options = typeof option == 'object' && option

            if (!data && /destroy|hide/.test(option))
                return
            if (!data)
                $this.data('bs.tooltip', (data = new Tooltip(this, options)))
            if (typeof option == 'string')
                data[option]()
        })
    }

    var old = $.fn.tooltip

    $.fn.tooltip = Plugin
    $.fn.tooltip.Constructor = Tooltip


    // TOOLTIP NO CONFLICT
    // ===================

    $.fn.tooltip.noConflict = function () {
        $.fn.tooltip = old
        return this
    }

}(jQuery);

/* ========================================================================
 * Bootstrap: popover.js v3.3.2
 * http://getbootstrap.com/javascript/#popovers
 * ========================================================================
 * Copyright 2011-2015 Twitter, Inc.
 * Licensed under MIT (https://github.com/twbs/bootstrap/blob/master/LICENSE)
 * ======================================================================== */


+function ($) {
    'use strict';

    // POPOVER PUBLIC CLASS DEFINITION
    // ===============================

    var Popover = function (element, options) {
        this.init('popover', element, options)
    }

    if (!$.fn.tooltip)
        throw new Error('Popover requires tooltip.js')

    Popover.VERSION = '3.3.2'

    Popover.DEFAULTS = $.extend({}, $.fn.tooltip.Constructor.DEFAULTS, {
        placement: 'right',
        trigger: 'click',
        content: '',
        template: '<div class="popover" role="tooltip"><div class="arrow"></div><h3 class="popover-title"></h3><div class="popover-content"></div></div>'
    })


    // NOTE: POPOVER EXTENDS tooltip.js
    // ================================

    Popover.prototype = $.extend({}, $.fn.tooltip.Constructor.prototype)

    Popover.prototype.constructor = Popover

    Popover.prototype.getDefaults = function () {
        return Popover.DEFAULTS
    }

    Popover.prototype.setContent = function () {
        var $tip = this.tip()
        var title = this.getTitle()
        var content = this.getContent()

        $tip.find('.popover-title')[this.options.html ? 'html' : 'text'](title)
        $tip.find('.popover-content').children().detach().end()[ // we use append for html objects to maintain js events
                this.options.html ? (typeof content == 'string' ? 'html' : 'append') : 'text'
        ](content)

        $tip.removeClass('fade top bottom left right in')

        // IE8 doesn't accept hiding via the `:empty` pseudo selector, we have to do
        // this manually by checking the contents.
        if (!$tip.find('.popover-title').html())
            $tip.find('.popover-title').hide()
    }

    Popover.prototype.hasContent = function () {
        return this.getTitle() || this.getContent()
    }

    Popover.prototype.getContent = function () {
        var $e = this.$element
        var o = this.options

        return $e.attr('data-content')
                || (typeof o.content == 'function' ?
                        o.content.call($e[0]) :
                        o.content)
    }

    Popover.prototype.arrow = function () {
        return (this.$arrow = this.$arrow || this.tip().find('.arrow'))
    }


    // POPOVER PLUGIN DEFINITION
    // =========================

    function Plugin(option) {
        return this.each(function () {
            var $this = $(this)
            var data = $this.data('bs.popover')
            var options = typeof option == 'object' && option

            if (!data && /destroy|hide/.test(option))
                return
            if (!data)
                $this.data('bs.popover', (data = new Popover(this, options)))
            if (typeof option == 'string')
                data[option]()
        })
    }

    var old = $.fn.popover

    $.fn.popover = Plugin
    $.fn.popover.Constructor = Popover


    // POPOVER NO CONFLICT
    // ===================

    $.fn.popover.noConflict = function () {
        $.fn.popover = old
        return this
    }

}(jQuery);

/* ========================================================================
 * Bootstrap: scrollspy.js v3.3.2
 * http://getbootstrap.com/javascript/#scrollspy
 * ========================================================================
 * Copyright 2011-2015 Twitter, Inc.
 * Licensed under MIT (https://github.com/twbs/bootstrap/blob/master/LICENSE)
 * ======================================================================== */


+function ($) {
    'use strict';

    // SCROLLSPY CLASS DEFINITION
    // ==========================

    function ScrollSpy(element, options) {
        this.$body = $(document.body)
        this.$scrollElement = $(element).is(document.body) ? $(window) : $(element)
        this.options = $.extend({}, ScrollSpy.DEFAULTS, options)
        this.selector = (this.options.target || '') + ' .nav li > a'
        this.offsets = []
        this.targets = []
        this.activeTarget = null
        this.scrollHeight = 0

        this.$scrollElement.on('scroll.bs.scrollspy', $.proxy(this.process, this))
        this.refresh()
        this.process()
    }

    ScrollSpy.VERSION = '3.3.2'

    ScrollSpy.DEFAULTS = {
        offset: 10
    }

    ScrollSpy.prototype.getScrollHeight = function () {
        return this.$scrollElement[0].scrollHeight || Math.max(this.$body[0].scrollHeight, document.documentElement.scrollHeight)
    }

    ScrollSpy.prototype.refresh = function () {
        var that = this
        var offsetMethod = 'offset'
        var offsetBase = 0

        this.offsets = []
        this.targets = []
        this.scrollHeight = this.getScrollHeight()

        if (!$.isWindow(this.$scrollElement[0])) {
            offsetMethod = 'position'
            offsetBase = this.$scrollElement.scrollTop()
        }

        this.$body
                .find(this.selector)
                .map(function () {
                    var $el = $(this)
                    var href = $el.data('target') || $el.attr('href')
                    var $href = /^#./.test(href) && $(href)

                    return ($href
                            && $href.length
                            && $href.is(':visible')
                            && [[$href[offsetMethod]().top + offsetBase, href]]) || null
                })
                .sort(function (a, b) {
                    return a[0] - b[0]
                })
                .each(function () {
                    that.offsets.push(this[0])
                    that.targets.push(this[1])
                })
    }

    ScrollSpy.prototype.process = function () {
        var scrollTop = this.$scrollElement.scrollTop() + this.options.offset
        var scrollHeight = this.getScrollHeight()
        var maxScroll = this.options.offset + scrollHeight - this.$scrollElement.height()
        var offsets = this.offsets
        var targets = this.targets
        var activeTarget = this.activeTarget
        var i

        if (this.scrollHeight != scrollHeight) {
            this.refresh()
        }

        if (scrollTop >= maxScroll) {
            return activeTarget != (i = targets[targets.length - 1]) && this.activate(i)
        }

        if (activeTarget && scrollTop < offsets[0]) {
            this.activeTarget = null
            return this.clear()
        }

        for (i = offsets.length; i--; ) {
            activeTarget != targets[i]
                    && scrollTop >= offsets[i]
                    && (offsets[i + 1] === undefined || scrollTop <= offsets[i + 1])
                    && this.activate(targets[i])
        }
    }

    ScrollSpy.prototype.activate = function (target) {
        this.activeTarget = target

        this.clear()

        var selector = this.selector +
                '[data-target="' + target + '"],' +
                this.selector + '[href="' + target + '"]'

        var active = $(selector)
                .parents('li')
                .addClass('active')

        if (active.parent('.dropdown-menu').length) {
            active = active
                    .closest('li.dropdown')
                    .addClass('active')
        }

        active.trigger('activate.bs.scrollspy')
    }

    ScrollSpy.prototype.clear = function () {
        $(this.selector)
                .parentsUntil(this.options.target, '.active')
                .removeClass('active')
    }


    // SCROLLSPY PLUGIN DEFINITION
    // ===========================

    function Plugin(option) {
        return this.each(function () {
            var $this = $(this)
            var data = $this.data('bs.scrollspy')
            var options = typeof option == 'object' && option

            if (!data)
                $this.data('bs.scrollspy', (data = new ScrollSpy(this, options)))
            if (typeof option == 'string')
                data[option]()
        })
    }

    var old = $.fn.scrollspy

    $.fn.scrollspy = Plugin
    $.fn.scrollspy.Constructor = ScrollSpy


    // SCROLLSPY NO CONFLICT
    // =====================

    $.fn.scrollspy.noConflict = function () {
        $.fn.scrollspy = old
        return this
    }


    // SCROLLSPY DATA-API
    // ==================

    $(window).on('load.bs.scrollspy.data-api', function () {
        $('[data-spy="scroll"]').each(function () {
            var $spy = $(this)
            Plugin.call($spy, $spy.data())
        })
    })

}(jQuery);

/* ========================================================================
 * Bootstrap: tab.js v3.3.2
 * http://getbootstrap.com/javascript/#tabs
 * ========================================================================
 * Copyright 2011-2015 Twitter, Inc.
 * Licensed under MIT (https://github.com/twbs/bootstrap/blob/master/LICENSE)
 * ======================================================================== */


+function ($) {
    'use strict';

    // TAB CLASS DEFINITION
    // ====================

    var Tab = function (element) {
        this.element = $(element)
    }

    Tab.VERSION = '3.3.2'

    Tab.TRANSITION_DURATION = 150

    Tab.prototype.show = function () {
        var $this = this.element
        var $ul = $this.closest('ul:not(.dropdown-menu)')
        var selector = $this.data('target')

        if (!selector) {
            selector = $this.attr('href')
            selector = selector && selector.replace(/.*(?=#[^\s]*$)/, '') // strip for ie7
        }

        if ($this.parent('li').hasClass('active'))
            return

        var $previous = $ul.find('.active:last a')
        var hideEvent = $.Event('hide.bs.tab', {
            relatedTarget: $this[0]
        })
        var showEvent = $.Event('show.bs.tab', {
            relatedTarget: $previous[0]
        })

        $previous.trigger(hideEvent)
        $this.trigger(showEvent)

        if (showEvent.isDefaultPrevented() || hideEvent.isDefaultPrevented())
            return

        var $target = $(selector)

        this.activate($this.closest('li'), $ul)
        this.activate($target, $target.parent(), function () {
            $previous.trigger({
                type: 'hidden.bs.tab',
                relatedTarget: $this[0]
            })
            $this.trigger({
                type: 'shown.bs.tab',
                relatedTarget: $previous[0]
            })
        })
    }

    Tab.prototype.activate = function (element, container, callback) {
        var $active = container.find('> .active')
        var transition = callback
                && $.support.transition
                && (($active.length && $active.hasClass('fade')) || !!container.find('> .fade').length)

        function next() {
            $active
                    .removeClass('active')
                    .find('> .dropdown-menu > .active')
                    .removeClass('active')
                    .end()
                    .find('[data-toggle="tab"]')
                    .attr('aria-expanded', false)

            element
                    .addClass('active')
                    .find('[data-toggle="tab"]')
                    .attr('aria-expanded', true)

            if (transition) {
                element[0].offsetWidth // reflow for transition
                element.addClass('in')
            } else {
                element.removeClass('fade')
            }

            if (element.parent('.dropdown-menu').length) {
                element
                        .closest('li.dropdown')
                        .addClass('active')
                        .end()
                        .find('[data-toggle="tab"]')
                        .attr('aria-expanded', true)
            }

            callback && callback()
        }

        $active.length && transition ?
                $active
                .one('bsTransitionEnd', next)
                .emulateTransitionEnd(Tab.TRANSITION_DURATION) :
                next()

        $active.removeClass('in')
    }


    // TAB PLUGIN DEFINITION
    // =====================

    function Plugin(option) {
        return this.each(function () {
            var $this = $(this)
            var data = $this.data('bs.tab')

            if (!data)
                $this.data('bs.tab', (data = new Tab(this)))
            if (typeof option == 'string')
                data[option]()
        })
    }

    var old = $.fn.tab

    $.fn.tab = Plugin
    $.fn.tab.Constructor = Tab


    // TAB NO CONFLICT
    // ===============

    $.fn.tab.noConflict = function () {
        $.fn.tab = old
        return this
    }


    // TAB DATA-API
    // ============

    var clickHandler = function (e) {
        e.preventDefault()
        Plugin.call($(this), 'show')
    }

    $(document)
            .on('click.bs.tab.data-api', '[data-toggle="tab"]', clickHandler)
            .on('click.bs.tab.data-api', '[data-toggle="pill"]', clickHandler)

}(jQuery);

/* ========================================================================
 * Bootstrap: affix.js v3.3.2
 * http://getbootstrap.com/javascript/#affix
 * ========================================================================
 * Copyright 2011-2015 Twitter, Inc.
 * Licensed under MIT (https://github.com/twbs/bootstrap/blob/master/LICENSE)
 * ======================================================================== */


+function ($) {
    'use strict';

    // AFFIX CLASS DEFINITION
    // ======================

    var Affix = function (element, options) {
        this.options = $.extend({}, Affix.DEFAULTS, options)

        this.$target = $(this.options.target)
                .on('scroll.bs.affix.data-api', $.proxy(this.checkPosition, this))
                .on('click.bs.affix.data-api', $.proxy(this.checkPositionWithEventLoop, this))

        this.$element = $(element)
        this.affixed = null
        this.unpin = null
        this.pinnedOffset = null

        this.checkPosition()
    }

    Affix.VERSION = '3.3.2'

    Affix.RESET = 'affix affix-top affix-bottom'

    Affix.DEFAULTS = {
        offset: 0,
        target: window
    }

    Affix.prototype.getState = function (scrollHeight, height, offsetTop, offsetBottom) {
        var scrollTop = this.$target.scrollTop()
        var position = this.$element.offset()
        var targetHeight = this.$target.height()

        if (offsetTop != null && this.affixed == 'top')
            return scrollTop < offsetTop ? 'top' : false

        if (this.affixed == 'bottom') {
            if (offsetTop != null)
                return (scrollTop + this.unpin <= position.top) ? false : 'bottom'
            return (scrollTop + targetHeight <= scrollHeight - offsetBottom) ? false : 'bottom'
        }

        var initializing = this.affixed == null
        var colliderTop = initializing ? scrollTop : position.top
        var colliderHeight = initializing ? targetHeight : height

        if (offsetTop != null && scrollTop <= offsetTop)
            return 'top'
        if (offsetBottom != null && (colliderTop + colliderHeight >= scrollHeight - offsetBottom))
            return 'bottom'

        return false
    }

    Affix.prototype.getPinnedOffset = function () {
        if (this.pinnedOffset)
            return this.pinnedOffset
        this.$element.removeClass(Affix.RESET).addClass('affix')
        var scrollTop = this.$target.scrollTop()
        var position = this.$element.offset()
        return (this.pinnedOffset = position.top - scrollTop)
    }

    Affix.prototype.checkPositionWithEventLoop = function () {
        setTimeout($.proxy(this.checkPosition, this), 1)
    }

    Affix.prototype.checkPosition = function () {
        if (!this.$element.is(':visible'))
            return

        var height = this.$element.height()
        var offset = this.options.offset
        var offsetTop = offset.top
        var offsetBottom = offset.bottom
        var scrollHeight = $(document.body).height()

        if (typeof offset != 'object')
            offsetBottom = offsetTop = offset
        if (typeof offsetTop == 'function')
            offsetTop = offset.top(this.$element)
        if (typeof offsetBottom == 'function')
            offsetBottom = offset.bottom(this.$element)

        var affix = this.getState(scrollHeight, height, offsetTop, offsetBottom)

        if (this.affixed != affix) {
            if (this.unpin != null)
                this.$element.css('top', '')

            var affixType = 'affix' + (affix ? '-' + affix : '')
            var e = $.Event(affixType + '.bs.affix')

            this.$element.trigger(e)

            if (e.isDefaultPrevented())
                return

            this.affixed = affix
            this.unpin = affix == 'bottom' ? this.getPinnedOffset() : null

            this.$element
                    .removeClass(Affix.RESET)
                    .addClass(affixType)
                    .trigger(affixType.replace('affix', 'affixed') + '.bs.affix')
        }

        if (affix == 'bottom') {
            this.$element.offset({
                top: scrollHeight - height - offsetBottom
            })
        }
    }


    // AFFIX PLUGIN DEFINITION
    // =======================

    function Plugin(option) {
        return this.each(function () {
            var $this = $(this)
            var data = $this.data('bs.affix')
            var options = typeof option == 'object' && option

            if (!data)
                $this.data('bs.affix', (data = new Affix(this, options)))
            if (typeof option == 'string')
                data[option]()
        })
    }

    var old = $.fn.affix

    $.fn.affix = Plugin
    $.fn.affix.Constructor = Affix


    // AFFIX NO CONFLICT
    // =================

    $.fn.affix.noConflict = function () {
        $.fn.affix = old
        return this
    }


    // AFFIX DATA-API
    // ==============

    $(window).on('load', function () {
        $('[data-spy="affix"]').each(function () {
            var $spy = $(this)
            var data = $spy.data()

            data.offset = data.offset || {}

            if (data.offsetBottom != null)
                data.offset.bottom = data.offsetBottom
            if (data.offsetTop != null)
                data.offset.top = data.offsetTop

            Plugin.call($spy, data)
        })
    })

}(jQuery);


/*
 * Project: Bootstrap Notify = v3.1.5
 * Description: Turns standard Bootstrap alerts into "Growl-like" notifications.
 * Author: Mouse0270 aka Robert McIntosh
 * License: MIT License
 * Website: https://github.com/mouse0270/bootstrap-growl
 */

/* global define:false, require: false, jQuery:false */

(function (factory) {
    if (typeof define === 'function' && define.amd) {
        // AMD. Register as an anonymous module.
        define(['jquery'], factory);
    } else if (typeof exports === 'object') {
        // Node/CommonJS
        factory(require('jquery'));
    } else {
        // Browser globals
        factory(jQuery);
    }
}(function ($) {
    // Create the defaults once
    var defaults = {
        element: 'body',
        position: null,
        type: "info",
        allow_dismiss: true,
        allow_duplicates: true,
        newest_on_top: false,
        showProgressbar: false,
        placement: {
            from: "top",
            align: "right"
        },
        offset: 20,
        spacing: 10,
        z_index: 1031,
        delay: 5000,
        timer: 1000,
        url_target: '_blank',
        mouse_over: null,
        animate: {
            enter: 'animated fadeInDown',
            exit: 'animated fadeOutUp'
        },
        onShow: null,
        onShown: null,
        onClose: null,
        onClosed: null,
        icon_type: 'class',
        template: '<div data-notify="container" class="col-xs-11 col-sm-4 alert alert-{0}" role="alert"><button type="button" aria-hidden="true" class="close" data-notify="dismiss">&times;</button><span data-notify="icon"></span> <span data-notify="title">{1}</span> <span data-notify="message">{2}</span><div class="progress" data-notify="progressbar"><div class="progress-bar progress-bar-{0}" role="progressbar" aria-valuenow="0" aria-valuemin="0" aria-valuemax="100" style="width: 0%;"></div></div><a href="{3}" target="{4}" data-notify="url"></a></div>'
    };

    String.format = function () {
        var str = arguments[0];
        for (var i = 1; i < arguments.length; i++) {
            str = str.replace(RegExp("\\{" + (i - 1) + "\\}", "gm"), arguments[i]);
        }
        return str;
    };

    function isDuplicateNotification(notification) {
        var isDupe = false;

        $('[data-notify="container"]').each(function (i, el) {
            var $el = $(el);
            var title = $el.find('[data-notify="title"]').text().trim();
            var message = $el.find('[data-notify="message"]').html().trim();

            // The input string might be different than the actual parsed HTML string!
            // (<br> vs <br /> for example)
            // So we have to force-parse this as HTML here!
            var isSameTitle = title === $("<div>" + notification.settings.content.title + "</div>").html().trim();
            var isSameMsg = message === $("<div>" + notification.settings.content.message + "</div>").html().trim();
            var isSameType = $el.hasClass('alert-' + notification.settings.type);

            if (isSameTitle && isSameMsg && isSameType) {
                //we found the dupe. Set the var and stop checking.
                isDupe = true;
            }
            return !isDupe;
        });

        return isDupe;
    }

    function Notify(element, content, options) {
        // Setup Content of Notify
        var contentObj = {
            content: {
                message: typeof content === 'object' ? content.message : content,
                title: content.title ? content.title : '',
                icon: content.icon ? content.icon : '',
                url: content.url ? content.url : '#',
                target: content.target ? content.target : '-'
            }
        };

        options = $.extend(true, {}, contentObj, options);
        this.settings = $.extend(true, {}, defaults, options);
        this._defaults = defaults;
        if (this.settings.content.target === "-") {
            this.settings.content.target = this.settings.url_target;
        }
        this.animations = {
            start: 'webkitAnimationStart oanimationstart MSAnimationStart animationstart',
            end: 'webkitAnimationEnd oanimationend MSAnimationEnd animationend'
        };

        if (typeof this.settings.offset === 'number') {
            this.settings.offset = {
                x: this.settings.offset,
                y: this.settings.offset
            };
        }

        //if duplicate messages are not allowed, then only continue if this new message is not a duplicate of one that it already showing
        if (this.settings.allow_duplicates || (!this.settings.allow_duplicates && !isDuplicateNotification(this))) {
            this.init();
        }
    }

    $.extend(Notify.prototype, {
        init: function () {
            var self = this;

            this.buildNotify();
            if (this.settings.content.icon) {
                this.setIcon();
            }
            if (this.settings.content.url != "#") {
                this.styleURL();
            }
            this.styleDismiss();
            this.placement();
            this.bind();

            this.notify = {
                $ele: this.$ele,
                update: function (command, update) {
                    var commands = {};
                    if (typeof command === "string") {
                        commands[command] = update;
                    } else {
                        commands = command;
                    }
                    for (var cmd in commands) {
                        switch (cmd) {
                            case "type":
                                this.$ele.removeClass('alert-' + self.settings.type);
                                this.$ele.find('[data-notify="progressbar"] > .progress-bar').removeClass('progress-bar-' + self.settings.type);
                                self.settings.type = commands[cmd];
                                this.$ele.addClass('alert-' + commands[cmd]).find('[data-notify="progressbar"] > .progress-bar').addClass('progress-bar-' + commands[cmd]);
                                break;
                            case "icon":
                                var $icon = this.$ele.find('[data-notify="icon"]');
                                if (self.settings.icon_type.toLowerCase() === 'class') {
                                    $icon.removeClass(self.settings.content.icon).addClass(commands[cmd]);
                                } else {
                                    if (!$icon.is('img')) {
                                        $icon.find('img');
                                    }
                                    $icon.attr('src', commands[cmd]);
                                }
                                break;
                            case "progress":
                                var newDelay = self.settings.delay - (self.settings.delay * (commands[cmd] / 100));
                                this.$ele.data('notify-delay', newDelay);
                                this.$ele.find('[data-notify="progressbar"] > div').attr('aria-valuenow', commands[cmd]).css('width', commands[cmd] + '%');
                                break;
                            case "url":
                                this.$ele.find('[data-notify="url"]').attr('href', commands[cmd]);
                                break;
                            case "target":
                                this.$ele.find('[data-notify="url"]').attr('target', commands[cmd]);
                                break;
                            default:
                                this.$ele.find('[data-notify="' + cmd + '"]').html(commands[cmd]);
                        }
                    }
                    var posX = this.$ele.outerHeight() + parseInt(self.settings.spacing) + parseInt(self.settings.offset.y);
                    self.reposition(posX);
                },
                close: function () {
                    self.close();
                }
            };

        },
        buildNotify: function () {
            var content = this.settings.content;
            this.$ele = $(String.format(this.settings.template, this.settings.type, content.title, content.message, content.url, content.target));
            this.$ele.attr('data-notify-position', this.settings.placement.from + '-' + this.settings.placement.align);
            if (!this.settings.allow_dismiss) {
                this.$ele.find('[data-notify="dismiss"]').css('display', 'none');
            }
            if ((this.settings.delay <= 0 && !this.settings.showProgressbar) || !this.settings.showProgressbar) {
                this.$ele.find('[data-notify="progressbar"]').remove();
            }
        },
        setIcon: function () {
            if (this.settings.icon_type.toLowerCase() === 'class') {
                this.$ele.find('[data-notify="icon"]').addClass(this.settings.content.icon);
            } else {
                if (this.$ele.find('[data-notify="icon"]').is('img')) {
                    this.$ele.find('[data-notify="icon"]').attr('src', this.settings.content.icon);
                } else {
                    this.$ele.find('[data-notify="icon"]').append('<img src="' + this.settings.content.icon + '" alt="Notify Icon" />');
                }
            }
        },
        styleDismiss: function () {
            this.$ele.find('[data-notify="dismiss"]').css({
                position: 'absolute',
                right: '10px',
                top: '5px',
                zIndex: this.settings.z_index + 2
            });
        },
        styleURL: function () {
            this.$ele.find('[data-notify="url"]').css({
                backgroundImage: 'url(data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7)',
                height: '100%',
                left: 0,
                position: 'absolute',
                top: 0,
                width: '100%',
                zIndex: this.settings.z_index + 1
            });
        },
        placement: function () {
            var self = this,
                    offsetAmt = this.settings.offset.y,
                    css = {
                        display: 'inline-block',
                        margin: '0px auto',
                        position: this.settings.position ? this.settings.position : (this.settings.element === 'body' ? 'fixed' : 'absolute'),
                        transition: 'all .5s ease-in-out',
                        zIndex: this.settings.z_index
                    },
            hasAnimation = false,
                    settings = this.settings;

            $('[data-notify-position="' + this.settings.placement.from + '-' + this.settings.placement.align + '"]:not([data-closing="true"])').each(function () {
                offsetAmt = Math.max(offsetAmt, parseInt($(this).css(settings.placement.from)) + parseInt($(this).outerHeight()) + parseInt(settings.spacing));
            });
            if (this.settings.newest_on_top === true) {
                offsetAmt = this.settings.offset.y;
            }
            css[this.settings.placement.from] = offsetAmt + 'px';

            switch (this.settings.placement.align) {
                case "left":
                case "right":
                    css[this.settings.placement.align] = this.settings.offset.x + 'px';
                    break;
                case "center":
                    css.left = 0;
                    css.right = 0;
                    break;
            }
            this.$ele.css(css).addClass(this.settings.animate.enter);
            $.each(Array('webkit-', 'moz-', 'o-', 'ms-', ''), function (index, prefix) {
                self.$ele[0].style[prefix + 'AnimationIterationCount'] = 1;
            });

            $(this.settings.element).append(this.$ele);

            if (this.settings.newest_on_top === true) {
                offsetAmt = (parseInt(offsetAmt) + parseInt(this.settings.spacing)) + this.$ele.outerHeight();
                this.reposition(offsetAmt);
            }

            if ($.isFunction(self.settings.onShow)) {
                self.settings.onShow.call(this.$ele);
            }

            this.$ele.one(this.animations.start, function () {
                hasAnimation = true;
            }).one(this.animations.end, function () {
                if ($.isFunction(self.settings.onShown)) {
                    self.settings.onShown.call(this);
                }
            });

            setTimeout(function () {
                if (!hasAnimation) {
                    if ($.isFunction(self.settings.onShown)) {
                        self.settings.onShown.call(this);
                    }
                }
            }, 600);
        },
        bind: function () {
            var self = this;

            this.$ele.find('[data-notify="dismiss"]').on('click', function () {
                self.close();
            });

            this.$ele.mouseover(function () {
                $(this).data('data-hover', "true");
            }).mouseout(function () {
                $(this).data('data-hover', "false");
            });
            this.$ele.data('data-hover', "false");

            if (this.settings.delay > 0) {
                self.$ele.data('notify-delay', self.settings.delay);
                var timer = setInterval(function () {
                    var delay = parseInt(self.$ele.data('notify-delay')) - self.settings.timer;
                    if ((self.$ele.data('data-hover') === 'false' && self.settings.mouse_over === "pause") || self.settings.mouse_over != "pause") {
                        var percent = ((self.settings.delay - delay) / self.settings.delay) * 100;
                        self.$ele.data('notify-delay', delay);
                        self.$ele.find('[data-notify="progressbar"] > div').attr('aria-valuenow', percent).css('width', percent + '%');
                    }
                    if (delay <= -(self.settings.timer)) {
                        clearInterval(timer);
                        self.close();
                    }
                }, self.settings.timer);
            }
        },
        close: function () {
            var self = this,
                    posX = parseInt(this.$ele.css(this.settings.placement.from)),
                    hasAnimation = false;

            this.$ele.data('closing', 'true').addClass(this.settings.animate.exit);
            self.reposition(posX);

            if ($.isFunction(self.settings.onClose)) {
                self.settings.onClose.call(this.$ele);
            }

            this.$ele.one(this.animations.start, function () {
                hasAnimation = true;
            }).one(this.animations.end, function () {
                $(this).remove();
                if ($.isFunction(self.settings.onClosed)) {
                    self.settings.onClosed.call(this);
                }
            });

            setTimeout(function () {
                if (!hasAnimation) {
                    self.$ele.remove();
                    if (self.settings.onClosed) {
                        self.settings.onClosed(self.$ele);
                    }
                }
            }, 600);
        },
        reposition: function (posX) {
            var self = this,
                    notifies = '[data-notify-position="' + this.settings.placement.from + '-' + this.settings.placement.align + '"]:not([data-closing="true"])',
                    $elements = this.$ele.nextAll(notifies);
            if (this.settings.newest_on_top === true) {
                $elements = this.$ele.prevAll(notifies);
            }
            $elements.each(function () {
                $(this).css(self.settings.placement.from, posX);
                posX = (parseInt(posX) + parseInt(self.settings.spacing)) + $(this).outerHeight();
            });
        }
    });

    $.notify = function (content, options) {
        var plugin = new Notify(this, content, options);
        return plugin.notify;
    };
    $.notifyDefaults = function (options) {
        defaults = $.extend(true, {}, defaults, options);
        return defaults;
    };
    $.notifyClose = function (command) {
        if (typeof command === "undefined" || command === "all") {
            $('[data-notify]').find('[data-notify="dismiss"]').trigger('click');
        } else {
            $('[data-notify-position="' + command + '"]').find('[data-notify="dismiss"]').trigger('click');
        }
    };

}));

/* ========================================================================
 * bootstrap-tour - v0.10.1
 * http://bootstraptour.com
 * ========================================================================
 * Copyright 2012-2013 Ulrich Sossou
 *
 * ========================================================================
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 * ========================================================================
 */

(function ($, window) {
    var Tour, document;
    document = window.document;
    Tour = (function () {
        function Tour(options) {
            var storage;
            try {
                storage = window.localStorage;
            } catch (_error) {
                storage = false;
            }
            this._options = $.extend({
                name: 'tour',
                steps: [],
                container: 'body',
                autoscroll: true,
                keyboard: true,
                storage: storage,
                debug: false,
                backdrop: false,
                backdropPadding: 0,
                redirect: true,
                orphan: false,
                duration: false,
                delay: false,
                basePath: '',
                template: '<div class="popover" role="tooltip"> <div class="arrow"></div> <h3 class="popover-title"></h3> <div class="popover-content"></div> <div class="popover-navigation"> <div class="btn-group"> <button class="btn btn-sm btn-default" data-role="prev">&laquo; Prev</button> <button class="btn btn-sm btn-default" data-role="next">Next &raquo;</button> <button class="btn btn-sm btn-default" data-role="pause-resume" data-pause-text="Pause" data-resume-text="Resume">Pause</button> </div> <button class="btn btn-sm btn-default" data-role="end">End tour</button> </div> </div>',
                afterSetState: function (key, value) {
                },
                afterGetState: function (key, value) {
                },
                afterRemoveState: function (key) {
                },
                onStart: function (tour) {
                },
                onEnd: function (tour) {
                },
                onShow: function (tour) {
                },
                onShown: function (tour) {
                },
                onHide: function (tour) {
                },
                onHidden: function (tour) {
                },
                onNext: function (tour) {
                },
                onPrev: function (tour) {
                },
                onPause: function (tour, duration) {
                },
                onResume: function (tour, duration) {
                }
            }, options);
            this._force = false;
            this._inited = false;
            this.backdrop = {
                overlay: null,
                $element: null,
                $background: null,
                backgroundShown: false,
                overlayElementShown: false
            };
            this;
        }

        Tour.prototype.addSteps = function (steps) {
            var step, _i, _len;
            for (_i = 0, _len = steps.length; _i < _len; _i++) {
                step = steps[_i];
                this.addStep(step);
            }
            return this;
        };

        Tour.prototype.addStep = function (step) {
            this._options.steps.push(step);
            return this;
        };

        Tour.prototype.getStep = function (i) {
            if (this._options.steps[i] != null) {
                return $.extend({
                    id: "step-" + i,
                    path: '',
                    placement: 'right',
                    title: '',
                    content: '<p></p>',
                    next: i === this._options.steps.length - 1 ? -1 : i + 1,
                    prev: i - 1,
                    animation: true,
                    container: this._options.container,
                    autoscroll: this._options.autoscroll,
                    backdrop: this._options.backdrop,
                    backdropPadding: this._options.backdropPadding,
                    redirect: this._options.redirect,
                    orphan: this._options.orphan,
                    duration: this._options.duration,
                    delay: this._options.delay,
                    template: this._options.template,
                    onShow: this._options.onShow,
                    onShown: this._options.onShown,
                    onHide: this._options.onHide,
                    onHidden: this._options.onHidden,
                    onNext: this._options.onNext,
                    onPrev: this._options.onPrev,
                    onPause: this._options.onPause,
                    onResume: this._options.onResume
                }, this._options.steps[i]);
            }
        };

        Tour.prototype.init = function (force) {
            this._force = force;
            if (this.ended()) {
                this._debug('Tour ended, init prevented.');
                return this;
            }
            this.setCurrentStep();
            this._initMouseNavigation();
            this._initKeyboardNavigation();
            this._onResize((function (_this) {
                return function () {
                    return _this.showStep(_this._current);
                };
            })(this));
            if (this._current !== null) {
                this.showStep(this._current);
            }
            this._inited = true;
            return this;
        };

        Tour.prototype.start = function (force) {
            var promise;
            if (force == null) {
                force = false;
            }
            if (!this._inited) {
                this.init(force);
            }
            if (this._current === null) {
                promise = this._makePromise(this._options.onStart != null ? this._options.onStart(this) : void 0);
                this._callOnPromiseDone(promise, this.showStep, 0);
            }
            return this;
        };

        Tour.prototype.next = function () {
            var promise;
            promise = this.hideStep(this._current);
            return this._callOnPromiseDone(promise, this._showNextStep);
        };

        Tour.prototype.prev = function () {
            var promise;
            promise = this.hideStep(this._current);
            return this._callOnPromiseDone(promise, this._showPrevStep);
        };

        Tour.prototype.goTo = function (i) {
            var promise;
            promise = this.hideStep(this._current);
            return this._callOnPromiseDone(promise, this.showStep, i);
        };

        Tour.prototype.end = function () {
            var endHelper, promise;
            endHelper = (function (_this) {
                return function (e) {
                    $(document).off("click.tour-" + _this._options.name);
                    $(document).off("keyup.tour-" + _this._options.name);
                    $(window).off("resize.tour-" + _this._options.name);
                    _this._setState('end', 'yes');
                    _this._inited = false;
                    _this._force = false;
                    _this._clearTimer();
                    if (_this._options.onEnd != null) {
                        return _this._options.onEnd(_this);
                    }
                };
            })(this);
            promise = this.hideStep(this._current);
            return this._callOnPromiseDone(promise, endHelper);
        };

        Tour.prototype.ended = function () {
            return !this._force && !!this._getState('end');
        };

        Tour.prototype.restart = function () {
            this._removeState('current_step');
            this._removeState('end');
            return this.start();
        };

        Tour.prototype.pause = function () {
            var step;
            step = this.getStep(this._current);
            if (!(step && step.duration)) {
                return this;
            }
            this._paused = true;
            this._duration -= new Date().getTime() - this._start;
            window.clearTimeout(this._timer);
            this._debug("Paused/Stopped step " + (this._current + 1) + " timer (" + this._duration + " remaining).");
            if (step.onPause != null) {
                return step.onPause(this, this._duration);
            }
        };

        Tour.prototype.resume = function () {
            var step;
            step = this.getStep(this._current);
            if (!(step && step.duration)) {
                return this;
            }
            this._paused = false;
            this._start = new Date().getTime();
            this._duration = this._duration || step.duration;
            this._timer = window.setTimeout((function (_this) {
                return function () {
                    if (_this._isLast()) {
                        return _this.next();
                    } else {
                        return _this.end();
                    }
                };
            })(this), this._duration);
            this._debug("Started step " + (this._current + 1) + " timer with duration " + this._duration);
            if ((step.onResume != null) && this._duration !== step.duration) {
                return step.onResume(this, this._duration);
            }
        };

        Tour.prototype.hideStep = function (i) {
            var hideStepHelper, promise, step;
            step = this.getStep(i);
            if (!step) {
                return;
            }
            this._clearTimer();
            promise = this._makePromise(step.onHide != null ? step.onHide(this, i) : void 0);
            hideStepHelper = (function (_this) {
                return function (e) {
                    var $element;
                    $element = $(step.element);
                    if (!($element.data('bs.popover') || $element.data('popover'))) {
                        $element = $('body');
                    }
                    $element.popover('destroy').removeClass("tour-" + _this._options.name + "-element tour-" + _this._options.name + "-" + i + "-element");
                    if (step.reflex) {
                        $element.removeClass('tour-step-element-reflex').off("" + (_this._reflexEvent(step.reflex)) + ".tour-" + _this._options.name);
                    }
                    if (step.backdrop) {
                        _this._hideBackdrop();
                    }
                    if (step.onHidden != null) {
                        return step.onHidden(_this);
                    }
                };
            })(this);
            this._callOnPromiseDone(promise, hideStepHelper);
            return promise;
        };

        Tour.prototype.showStep = function (i) {
            var promise, showStepHelper, skipToPrevious, step;
            if (this.ended()) {
                this._debug('Tour ended, showStep prevented.');
                return this;
            }
            step = this.getStep(i);
            if (!step) {
                return;
            }
            skipToPrevious = i < this._current;
            promise = this._makePromise(step.onShow != null ? step.onShow(this, i) : void 0);
            showStepHelper = (function (_this) {
                return function (e) {
                    var current_path, path, showPopoverAndOverlay;
                    _this.setCurrentStep(i);
                    path = (function () {
                        switch ( {
                            }.toString.call(step.path)) {
                            case '[object Function]':
                                return step.path();
                            case '[object String]':
                                return this._options.basePath + step.path;
                            default:
                                return step.path;
                        }
                    }).call(_this);
                    current_path = [document.location.pathname, document.location.hash].join('');
                    if (_this._isRedirect(path, current_path)) {
                        _this._redirect(step, path);
                        return;
                    }
                    if (_this._isOrphan(step)) {
                        if (!step.orphan) {
                            _this._debug("Skip the orphan step " + (_this._current + 1) + ".\nOrphan option is false and the element does not exist or is hidden.");
                            if (skipToPrevious) {
                                _this._showPrevStep();
                            } else {
                                _this._showNextStep();
                            }
                            return;
                        }
                        _this._debug("Show the orphan step " + (_this._current + 1) + ". Orphans option is true.");
                    }
                    if (step.backdrop) {
                        _this._showBackdrop(!_this._isOrphan(step) ? step.element : void 0);
                    }
                    showPopoverAndOverlay = function () {
                        if (_this.getCurrentStep() !== i) {
                            return;
                        }
                        if ((step.element != null) && step.backdrop) {
                            _this._showOverlayElement(step);
                        }
                        _this._showPopover(step, i);
                        if (step.onShown != null) {
                            step.onShown(_this);
                        }
                        return _this._debug("Step " + (_this._current + 1) + " of " + _this._options.steps.length);
                    };
                    if (step.autoscroll) {
                        _this._scrollIntoView(step.element, showPopoverAndOverlay);
                    } else {
                        showPopoverAndOverlay();
                    }
                    if (step.duration) {
                        return _this.resume();
                    }
                };
            })(this);
            if (step.delay) {
                this._debug("Wait " + step.delay + " milliseconds to show the step " + (this._current + 1));
                window.setTimeout((function (_this) {
                    return function () {
                        return _this._callOnPromiseDone(promise, showStepHelper);
                    };
                })(this), step.delay);
            } else {
                this._callOnPromiseDone(promise, showStepHelper);
            }
            return promise;
        };

        Tour.prototype.getCurrentStep = function () {
            return this._current;
        };

        Tour.prototype.setCurrentStep = function (value) {
            if (value != null) {
                this._current = value;
                this._setState('current_step', value);
            } else {
                this._current = this._getState('current_step');
                this._current = this._current === null ? null : parseInt(this._current, 10);
            }
            return this;
        };

        Tour.prototype._setState = function (key, value) {
            var e, keyName;
            if (this._options.storage) {
                keyName = "" + this._options.name + "_" + key;
                try {
                    this._options.storage.setItem(keyName, value);
                } catch (_error) {
                    e = _error;
                    if (e.code === DOMException.QUOTA_EXCEEDED_ERR) {
                        this._debug('LocalStorage quota exceeded. State storage failed.');
                    }
                }
                return this._options.afterSetState(keyName, value);
            } else {
                if (this._state == null) {
                    this._state = {};
                }
                return this._state[key] = value;
            }
        };

        Tour.prototype._removeState = function (key) {
            var keyName;
            if (this._options.storage) {
                keyName = "" + this._options.name + "_" + key;
                this._options.storage.removeItem(keyName);
                return this._options.afterRemoveState(keyName);
            } else {
                if (this._state != null) {
                    return delete this._state[key];
                }
            }
        };

        Tour.prototype._getState = function (key) {
            var keyName, value;
            if (this._options.storage) {
                keyName = "" + this._options.name + "_" + key;
                value = this._options.storage.getItem(keyName);
            } else {
                if (this._state != null) {
                    value = this._state[key];
                }
            }
            if (value === void 0 || value === 'null') {
                value = null;
            }
            this._options.afterGetState(key, value);
            return value;
        };

        Tour.prototype._showNextStep = function () {
            var promise, showNextStepHelper, step;
            step = this.getStep(this._current);
            showNextStepHelper = (function (_this) {
                return function (e) {
                    return _this.showStep(step.next);
                };
            })(this);
            promise = this._makePromise(step.onNext != null ? step.onNext(this) : void 0);
            return this._callOnPromiseDone(promise, showNextStepHelper);
        };

        Tour.prototype._showPrevStep = function () {
            var promise, showPrevStepHelper, step;
            step = this.getStep(this._current);
            showPrevStepHelper = (function (_this) {
                return function (e) {
                    return _this.showStep(step.prev);
                };
            })(this);
            promise = this._makePromise(step.onPrev != null ? step.onPrev(this) : void 0);
            return this._callOnPromiseDone(promise, showPrevStepHelper);
        };

        Tour.prototype._debug = function (text) {
            if (this._options.debug) {
                return void 0;
            }
        };

        Tour.prototype._isRedirect = function (path, currentPath) {
            return (path != null) && path !== '' && (({}.toString.call(path) === '[object RegExp]' && !path.test(currentPath)) || ({}.toString.call(path) === '[object String]' && path.replace(/\?.*$/, '').replace(/\/?$/, '') !== currentPath.replace(/\/?$/, '')));
        };

        Tour.prototype._redirect = function (step, path) {
            if ($.isFunction(step.redirect)) {
                return step.redirect.call(this, path);
            } else if (step.redirect === true) {
                this._debug("Redirect to " + path);
                return document.location.href = path;
            }
        };

        Tour.prototype._isOrphan = function (step) {
            return (step.element == null) || !$(step.element).length || $(step.element).is(':hidden') && ($(step.element)[0].namespaceURI !== 'http://www.w3.org/2000/svg');
        };

        Tour.prototype._isLast = function () {
            return this._current < this._options.steps.length - 1;
        };

        Tour.prototype._showPopover = function (step, i) {
            var $element, $tip, isOrphan, options;
            $(".tour-" + this._options.name).remove();
            options = $.extend({}, this._options);
            isOrphan = this._isOrphan(step);
            step.template = this._template(step, i);
            if (isOrphan) {
                step.element = 'body';
                step.placement = 'top';
            }
            $element = $(step.element);
            $element.addClass("tour-" + this._options.name + "-element tour-" + this._options.name + "-" + i + "-element");
            if (step.options) {
                $.extend(options, step.options);
            }
            if (step.reflex && !isOrphan) {
                $element.addClass('tour-step-element-reflex');
                $element.off("" + (this._reflexEvent(step.reflex)) + ".tour-" + this._options.name);
                $element.on("" + (this._reflexEvent(step.reflex)) + ".tour-" + this._options.name, (function (_this) {
                    return function () {
                        if (_this._isLast()) {
                            return _this.next();
                        } else {
                            return _this.end();
                        }
                    };
                })(this));
            }
            $element.popover({
                placement: step.placement,
                trigger: 'manual',
                title: step.title,
                content: step.content,
                html: true,
                animation: step.animation,
                container: step.container,
                template: step.template,
                selector: step.element
            }).popover('show');
            $tip = $element.data('bs.popover') ? $element.data('bs.popover').tip() : $element.data('popover').tip();
            $tip.attr('id', step.id);
            this._reposition($tip, step);
            if (isOrphan) {
                return this._center($tip);
            }
        };

        Tour.prototype._template = function (step, i) {
            var $navigation, $next, $prev, $resume, $template;
            $template = $.isFunction(step.template) ? $(step.template(i, step)) : $(step.template);
            $navigation = $template.find('.popover-navigation');
            $prev = $navigation.find('[data-role="prev"]');
            $next = $navigation.find('[data-role="next"]');
            $resume = $navigation.find('[data-role="pause-resume"]');
            if (this._isOrphan(step)) {
                $template.addClass('orphan');
            }
            $template.addClass("tour-" + this._options.name + " tour-" + this._options.name + "-" + i);
            if (step.prev < 0) {
                $prev.addClass('disabled');
            }
            if (step.next < 0) {
                $next.addClass('disabled');
            }
            if (!step.duration) {
                $resume.remove();
            }
            return $template.clone().wrap('<div>').parent().html();
        };

        Tour.prototype._reflexEvent = function (reflex) {
            if ({}.toString.call(reflex) === '[object Boolean]') {
                return 'click';
            } else {
                return reflex;
            }
        };

        Tour.prototype._reposition = function ($tip, step) {
            var offsetBottom, offsetHeight, offsetRight, offsetWidth, originalLeft, originalTop, tipOffset;
            offsetWidth = $tip[0].offsetWidth;
            offsetHeight = $tip[0].offsetHeight;
            tipOffset = $tip.offset();
            originalLeft = tipOffset.left;
            originalTop = tipOffset.top;
            offsetBottom = $(document).outerHeight() - tipOffset.top - $tip.outerHeight();
            if (offsetBottom < 0) {
                tipOffset.top = tipOffset.top + offsetBottom;
            }
            offsetRight = $('html').outerWidth() - tipOffset.left - $tip.outerWidth();
            if (offsetRight < 0) {
                tipOffset.left = tipOffset.left + offsetRight;
            }
            if (tipOffset.top < 0) {
                tipOffset.top = 0;
            }
            if (tipOffset.left < 0) {
                tipOffset.left = 0;
            }
            $tip.offset(tipOffset);
            if (step.placement === 'bottom' || step.placement === 'top') {
                if (originalLeft !== tipOffset.left) {
                    return this._replaceArrow($tip, (tipOffset.left - originalLeft) * 2, offsetWidth, 'left');
                }
            } else {
                if (originalTop !== tipOffset.top) {
                    return this._replaceArrow($tip, (tipOffset.top - originalTop) * 2, offsetHeight, 'top');
                }
            }
        };

        Tour.prototype._center = function ($tip) {
            return $tip.css('top', $(window).outerHeight() / 2 - $tip.outerHeight() / 2);
        };

        Tour.prototype._replaceArrow = function ($tip, delta, dimension, position) {
            return $tip.find('.arrow').css(position, delta ? 50 * (1 - delta / dimension) + '%' : '');
        };

        Tour.prototype._scrollIntoView = function (element, callback) {
            var $element, $window, counter, offsetTop, scrollTop, windowHeight;
            $element = $(element);
            if (!$element.length) {
                return callback();
            }
            $window = $(window);
            offsetTop = $element.offset().top;
            windowHeight = $window.height();
            scrollTop = Math.max(0, offsetTop - (windowHeight / 2));
            this._debug("Scroll into view. ScrollTop: " + scrollTop + ". Element offset: " + offsetTop + ". Window height: " + windowHeight + ".");
            counter = 0;
            return $('body, html').stop(true, true).animate({
                scrollTop: Math.ceil(scrollTop)
            }, (function (_this) {
                return function () {
                    if (++counter === 2) {
                        callback();
                        return _this._debug("Scroll into view.\nAnimation end element offset: " + ($element.offset().top) + ".\nWindow height: " + ($window.height()) + ".");
                    }
                };
            })(this));
        };

        Tour.prototype._onResize = function (callback, timeout) {
            return $(window).on("resize.tour-" + this._options.name, function () {
                clearTimeout(timeout);
                return timeout = setTimeout(callback, 100);
            });
        };

        Tour.prototype._initMouseNavigation = function () {
            var _this;
            _this = this;
            return $(document).off("click.tour-" + this._options.name, ".popover.tour-" + this._options.name + " *[data-role='prev']").off("click.tour-" + this._options.name, ".popover.tour-" + this._options.name + " *[data-role='next']").off("click.tour-" + this._options.name, ".popover.tour-" + this._options.name + " *[data-role='end']").off("click.tour-" + this._options.name, ".popover.tour-" + this._options.name + " *[data-role='pause-resume']").on("click.tour-" + this._options.name, ".popover.tour-" + this._options.name + " *[data-role='next']", (function (_this) {
                return function (e) {
                    e.preventDefault();
                    return _this.next();
                };
            })(this)).on("click.tour-" + this._options.name, ".popover.tour-" + this._options.name + " *[data-role='prev']", (function (_this) {
                return function (e) {
                    e.preventDefault();
                    return _this.prev();
                };
            })(this)).on("click.tour-" + this._options.name, ".popover.tour-" + this._options.name + " *[data-role='end']", (function (_this) {
                return function (e) {
                    e.preventDefault();
                    return _this.end();
                };
            })(this)).on("click.tour-" + this._options.name, ".popover.tour-" + this._options.name + " *[data-role='pause-resume']", function (e) {
                var $this;
                e.preventDefault();
                $this = $(this);
                $this.text(_this._paused ? $this.data('pause-text') : $this.data('resume-text'));
                if (_this._paused) {
                    return _this.resume();
                } else {
                    return _this.pause();
                }
            });
        };

        Tour.prototype._initKeyboardNavigation = function () {
            if (!this._options.keyboard) {
                return;
            }
            return $(document).on("keyup.tour-" + this._options.name, (function (_this) {
                return function (e) {
                    if (!e.which) {
                        return;
                    }
                    switch (e.which) {
                        case 39:
                            e.preventDefault();
                            if (_this._isLast()) {
                                return _this.next();
                            } else {
                                return _this.end();
                            }
                            break;
                        case 37:
                            e.preventDefault();
                            if (_this._current > 0) {
                                return _this.prev();
                            }
                            break;
                        case 27:
                            e.preventDefault();
                            return _this.end();
                    }
                };
            })(this));
        };

        Tour.prototype._makePromise = function (result) {
            if (result && $.isFunction(result.then)) {
                return result;
            } else {
                return null;
            }
        };

        Tour.prototype._callOnPromiseDone = function (promise, cb, arg) {
            if (promise) {
                return promise.then((function (_this) {
                    return function (e) {
                        return cb.call(_this, arg);
                    };
                })(this));
            } else {
                return cb.call(this, arg);
            }
        };

        Tour.prototype._showBackdrop = function (element) {
            if (this.backdrop.backgroundShown) {
                return;
            }
            this.backdrop = $('<div>', {
                "class": 'tour-backdrop'
            });
            this.backdrop.backgroundShown = true;
            return $('body').append(this.backdrop);
        };

        Tour.prototype._hideBackdrop = function () {
            this._hideOverlayElement();
            return this._hideBackground();
        };

        Tour.prototype._hideBackground = function () {
            if (this.backdrop) {
                this.backdrop.remove();
                this.backdrop.overlay = null;
                return this.backdrop.backgroundShown = false;
            }
        };

        Tour.prototype._showOverlayElement = function (step) {
            var $element, elementData;
            $element = $(step.element);
            if (!$element || $element.length === 0 || this.backdrop.overlayElementShown) {
                return;
            }
            this.backdrop.overlayElementShown = true;
            this.backdrop.$element = $element.addClass('tour-step-backdrop');
            this.backdrop.$background = $('<div>', {
                "class": 'tour-step-background'
            });
            elementData = {
                width: $element.innerWidth(),
                height: $element.innerHeight(),
                offset: $element.offset()
            };
            this.backdrop.$background.appendTo('body');
            if (step.backdropPadding) {
                elementData = this._applyBackdropPadding(step.backdropPadding, elementData);
            }
            return this.backdrop.$background.width(elementData.width).height(elementData.height).offset(elementData.offset);
        };

        Tour.prototype._hideOverlayElement = function () {
            if (!this.backdrop.overlayElementShown) {
                return;
            }
            this.backdrop.$element.removeClass('tour-step-backdrop');
            this.backdrop.$background.remove();
            this.backdrop.$element = null;
            this.backdrop.$background = null;
            return this.backdrop.overlayElementShown = false;
        };

        Tour.prototype._applyBackdropPadding = function (padding, data) {
            if (typeof padding === 'object') {
                if (padding.top == null) {
                    padding.top = 0;
                }
                if (padding.right == null) {
                    padding.right = 0;
                }
                if (padding.bottom == null) {
                    padding.bottom = 0;
                }
                if (padding.left == null) {
                    padding.left = 0;
                }
                data.offset.top = data.offset.top - padding.top;
                data.offset.left = data.offset.left - padding.left;
                data.width = data.width + padding.left + padding.right;
                data.height = data.height + padding.top + padding.bottom;
            } else {
                data.offset.top = data.offset.top - padding;
                data.offset.left = data.offset.left - padding;
                data.width = data.width + (padding * 2);
                data.height = data.height + (padding * 2);
            }
            return data;
        };

        Tour.prototype._clearTimer = function () {
            window.clearTimeout(this._timer);
            this._timer = null;
            return this._duration = null;
        };

        return Tour;

    })();
    return window.Tour = Tour;
})(jQuery, window);

/**
 * jQuery.browser.mobile (http://detectmobilebrowser.com/)
 *
 * jQuery.browser.mobile will be true if the browser is a mobile device
 *
 **/
(function(a){(jQuery.browser = jQuery.browser || {}).mobile = /(android|bb\d+|meego).+mobile|avantgo|bada\/|blackberry|blazer|compal|elaine|fennec|hiptop|iemobile|ip(hone|od)|iris|kindle|lge |maemo|midp|mmp|mobile.+firefox|netfront|opera m(ob|in)i|palm( os)?|phone|p(ixi|re)\/|plucker|pocket|psp|series(4|6)0|symbian|treo|up\.(browser|link)|vodafone|wap|windows ce|xda|xiino/i.test(a) || /1207|6310|6590|3gso|4thp|50[1-6]i|770s|802s|a wa|abac|ac(er|oo|s\-)|ai(ko|rn)|al(av|ca|co)|amoi|an(ex|ny|yw)|aptu|ar(ch|go)|as(te|us)|attw|au(di|\-m|r |s )|avan|be(ck|ll|nq)|bi(lb|rd)|bl(ac|az)|br(e|v)w|bumb|bw\-(n|u)|c55\/|capi|ccwa|cdm\-|cell|chtm|cldc|cmd\-|co(mp|nd)|craw|da(it|ll|ng)|dbte|dc\-s|devi|dica|dmob|do(c|p)o|ds(12|\-d)|el(49|ai)|em(l2|ul)|er(ic|k0)|esl8|ez([4-7]0|os|wa|ze)|fetc|fly(\-|_)|g1 u|g560|gene|gf\-5|g\-mo|go(\.w|od)|gr(ad|un)|haie|hcit|hd\-(m|p|t)|hei\-|hi(pt|ta)|hp( i|ip)|hs\-c|ht(c(\-| |_|a|g|p|s|t)|tp)|hu(aw|tc)|i\-(20|go|ma)|i230|iac( |\-|\/)|ibro|idea|ig01|ikom|im1k|inno|ipaq|iris|ja(t|v)a|jbro|jemu|jigs|kddi|keji|kgt( |\/)|klon|kpt |kwc\-|kyo(c|k)|le(no|xi)|lg( g|\/(k|l|u)|50|54|\-[a-w])|libw|lynx|m1\-w|m3ga|m50\/|ma(te|ui|xo)|mc(01|21|ca)|m\-cr|me(rc|ri)|mi(o8|oa|ts)|mmef|mo(01|02|bi|de|do|t(\-| |o|v)|zz)|mt(50|p1|v )|mwbp|mywa|n10[0-2]|n20[2-3]|n30(0|2)|n50(0|2|5)|n7(0(0|1)|10)|ne((c|m)\-|on|tf|wf|wg|wt)|nok(6|i)|nzph|o2im|op(ti|wv)|oran|owg1|p800|pan(a|d|t)|pdxg|pg(13|\-([1-8]|c))|phil|pire|pl(ay|uc)|pn\-2|po(ck|rt|se)|prox|psio|pt\-g|qa\-a|qc(07|12|21|32|60|\-[2-7]|i\-)|qtek|r380|r600|raks|rim9|ro(ve|zo)|s55\/|sa(ge|ma|mm|ms|ny|va)|sc(01|h\-|oo|p\-)|sdk\/|se(c(\-|0|1)|47|mc|nd|ri)|sgh\-|shar|sie(\-|m)|sk\-0|sl(45|id)|sm(al|ar|b3|it|t5)|so(ft|ny)|sp(01|h\-|v\-|v )|sy(01|mb)|t2(18|50)|t6(00|10|18)|ta(gt|lk)|tcl\-|tdg\-|tel(i|m)|tim\-|t\-mo|to(pl|sh)|ts(70|m\-|m3|m5)|tx\-9|up(\.b|g1|si)|utst|v400|v750|veri|vi(rg|te)|vk(40|5[0-3]|\-v)|vm40|voda|vulc|vx(52|53|60|61|70|80|81|83|85|98)|w3c(\-| )|webc|whit|wi(g |nc|nw)|wmlb|wonu|x700|yas\-|your|zeto|zte\-/i.test(a.substr(0, 4))})(navigator.userAgent || navigator.vendor || window.opera);
;
(function (window, document, undefined) {
    "use strict";

    (function e(t, n, r) {
        function s(o, u) {
            if (!n[o]) {
                if (!t[o]) {
                    var a = typeof require == "function" && require;
                    if (!u && a)
                        return a(o, !0);
                    if (i)
                        return i(o, !0);
                    var f = new Error("Cannot find module '" + o + "'");
                    throw f.code = "MODULE_NOT_FOUND", f
                }
                var l = n[o] = {exports: {}};
                t[o][0].call(l.exports, function (e) {
                    var n = t[o][1][e];
                    return s(n ? n : e)
                }, l, l.exports, e, t, n, r)
            }
            return n[o].exports
        }
        var i = typeof require == "function" && require;
        for (var o = 0; o < r.length; o++)
            s(r[o]);
        return s
    })({1: [function (require, module, exports) {
                'use strict';

                var _interopRequireWildcard = function (obj) {
                    return obj && obj.__esModule ? obj : {'default': obj};
                };

// SweetAlert
// 2014-2015 (c) - Tristan Edwards
// github.com/t4t5/sweetalert

                /*
                 * jQuery-like functions for manipulating the DOM
                 */

                var _hasClass$addClass$removeClass$escapeHtml$_show$show$_hide$hide$isDescendant$getTopMargin$fadeIn$fadeOut$fireClick$stopEventPropagation = require('./modules/handle-dom');

                /*
                 * Handy utilities
                 */

                var _extend$hexToRgb$isIE8$logStr$colorLuminance = require('./modules/utils');

                /*
                 *  Handle sweetAlert's DOM elements
                 */

                var _sweetAlertInitialize$getModal$getOverlay$getInput$setFocusStyle$openModal$resetInput$fixVerticalPosition = require('./modules/handle-swal-dom');

// Handle button events and keyboard events

                var _handleButton$handleConfirm$handleCancel = require('./modules/handle-click');

                var _handleKeyDown = require('./modules/handle-key');

                var _handleKeyDown2 = _interopRequireWildcard(_handleKeyDown);

// Default values

                var _defaultParams = require('./modules/default-params');

                var _defaultParams2 = _interopRequireWildcard(_defaultParams);

                var _setParameters = require('./modules/set-params');

                var _setParameters2 = _interopRequireWildcard(_setParameters);

                /*
                 * Remember state in cases where opening and handling a modal will fiddle with it.
                 * (We also use window.previousActiveElement as a global variable)
                 */
                var previousWindowKeyDown;
                var lastFocusedButton;

                /*
                 * Global sweetAlert function
                 * (this is what the user calls)
                 */
                var sweetAlert, swal;

                sweetAlert = swal = function () {
                    var customizations = arguments[0];

                    _hasClass$addClass$removeClass$escapeHtml$_show$show$_hide$hide$isDescendant$getTopMargin$fadeIn$fadeOut$fireClick$stopEventPropagation.addClass(document.body, 'stop-scrolling');
                    _sweetAlertInitialize$getModal$getOverlay$getInput$setFocusStyle$openModal$resetInput$fixVerticalPosition.resetInput();

                    /*
                     * Use argument if defined or default value from params object otherwise.
                     * Supports the case where a default value is boolean true and should be
                     * overridden by a corresponding explicit argument which is boolean false.
                     */
                    function argumentOrDefault(key) {
                        var args = customizations;
                        return args[key] === undefined ? _defaultParams2['default'][key] : args[key];
                    }

                    if (customizations === undefined) {
                        _extend$hexToRgb$isIE8$logStr$colorLuminance.logStr('SweetAlert expects at least 1 attribute!');
                        return false;
                    }

                    var params = _extend$hexToRgb$isIE8$logStr$colorLuminance.extend({}, _defaultParams2['default']);

                    switch (typeof customizations) {

                        // Ex: swal("Hello", "Just testing", "info");
                        case 'string':
                            params.title = customizations;
                            params.text = arguments[1] || '';
                            params.type = arguments[2] || '';
                            break;

                            // Ex: swal({ title:"Hello", text: "Just testing", type: "info" });
                        case 'object':
                            if (customizations.title === undefined) {
                                _extend$hexToRgb$isIE8$logStr$colorLuminance.logStr('Missing "title" argument!');
                                return false;
                            }

                            params.title = customizations.title;

                            for (var customName in _defaultParams2['default']) {
                                params[customName] = argumentOrDefault(customName);
                            }

                            // Show "Confirm" instead of "OK" if cancel button is visible
                            params.confirmButtonText = params.showCancelButton ? 'Confirm' : _defaultParams2['default'].confirmButtonText;
                            params.confirmButtonText = argumentOrDefault('confirmButtonText');

                            // Callback function when clicking on "OK"/"Cancel"
                            params.doneFunction = arguments[1] || null;

                            break;

                        default:
                            _extend$hexToRgb$isIE8$logStr$colorLuminance.logStr('Unexpected type of argument! Expected "string" or "object", got ' + typeof customizations);
                            return false;

                    }

                    _setParameters2['default'](params);
                    _sweetAlertInitialize$getModal$getOverlay$getInput$setFocusStyle$openModal$resetInput$fixVerticalPosition.fixVerticalPosition();
                    _sweetAlertInitialize$getModal$getOverlay$getInput$setFocusStyle$openModal$resetInput$fixVerticalPosition.openModal(arguments[1]);

                    // Modal interactions
                    var modal = _sweetAlertInitialize$getModal$getOverlay$getInput$setFocusStyle$openModal$resetInput$fixVerticalPosition.getModal();

                    /*
                     * Make sure all modal buttons respond to all events
                     */
                    var $buttons = modal.querySelectorAll('button');
                    var buttonEvents = ['onclick', 'onmouseover', 'onmouseout', 'onmousedown', 'onmouseup', 'onfocus'];
                    var onButtonEvent = function onButtonEvent(e) {
                        return _handleButton$handleConfirm$handleCancel.handleButton(e, params, modal);
                    };

                    for (var btnIndex = 0; btnIndex < $buttons.length; btnIndex++) {
                        for (var evtIndex = 0; evtIndex < buttonEvents.length; evtIndex++) {
                            var btnEvt = buttonEvents[evtIndex];
                            $buttons[btnIndex][btnEvt] = onButtonEvent;
                        }
                    }

                    // Clicking outside the modal dismisses it (if allowed by user)
                    _sweetAlertInitialize$getModal$getOverlay$getInput$setFocusStyle$openModal$resetInput$fixVerticalPosition.getOverlay().onclick = onButtonEvent;

                    previousWindowKeyDown = window.onkeydown;

                    var onKeyEvent = function onKeyEvent(e) {
                        return _handleKeyDown2['default'](e, params, modal);
                    };
                    window.onkeydown = onKeyEvent;

                    window.onfocus = function () {
                        // When the user has focused away and focused back from the whole window.
                        setTimeout(function () {
                            // Put in a timeout to jump out of the event sequence.
                            // Calling focus() in the event sequence confuses things.
                            if (lastFocusedButton !== undefined) {
                                lastFocusedButton.focus();
                                lastFocusedButton = undefined;
                            }
                        }, 0);
                    };

                    // Show alert with enabled buttons always
                    swal.enableButtons();
                };

                /*
                 * Set default params for each popup
                 * @param {Object} userParams
                 */
                sweetAlert.setDefaults = swal.setDefaults = function (userParams) {
                    if (!userParams) {
                        throw new Error('userParams is required');
                    }
                    if (typeof userParams !== 'object') {
                        throw new Error('userParams has to be a object');
                    }

                    _extend$hexToRgb$isIE8$logStr$colorLuminance.extend(_defaultParams2['default'], userParams);
                };

                /*
                 * Animation when closing modal
                 */
                sweetAlert.close = swal.close = function () {
                    var modal = _sweetAlertInitialize$getModal$getOverlay$getInput$setFocusStyle$openModal$resetInput$fixVerticalPosition.getModal();

                    _hasClass$addClass$removeClass$escapeHtml$_show$show$_hide$hide$isDescendant$getTopMargin$fadeIn$fadeOut$fireClick$stopEventPropagation.fadeOut(_sweetAlertInitialize$getModal$getOverlay$getInput$setFocusStyle$openModal$resetInput$fixVerticalPosition.getOverlay(), 5);
                    _hasClass$addClass$removeClass$escapeHtml$_show$show$_hide$hide$isDescendant$getTopMargin$fadeIn$fadeOut$fireClick$stopEventPropagation.fadeOut(modal, 5);
                    _hasClass$addClass$removeClass$escapeHtml$_show$show$_hide$hide$isDescendant$getTopMargin$fadeIn$fadeOut$fireClick$stopEventPropagation.removeClass(modal, 'showSweetAlert');
                    _hasClass$addClass$removeClass$escapeHtml$_show$show$_hide$hide$isDescendant$getTopMargin$fadeIn$fadeOut$fireClick$stopEventPropagation.addClass(modal, 'hideSweetAlert');
                    _hasClass$addClass$removeClass$escapeHtml$_show$show$_hide$hide$isDescendant$getTopMargin$fadeIn$fadeOut$fireClick$stopEventPropagation.removeClass(modal, 'visible');

                    /*
                     * Reset icon animations
                     */
                    var $successIcon = modal.querySelector('.sa-icon.sa-success');
                    _hasClass$addClass$removeClass$escapeHtml$_show$show$_hide$hide$isDescendant$getTopMargin$fadeIn$fadeOut$fireClick$stopEventPropagation.removeClass($successIcon, 'animate');
                    _hasClass$addClass$removeClass$escapeHtml$_show$show$_hide$hide$isDescendant$getTopMargin$fadeIn$fadeOut$fireClick$stopEventPropagation.removeClass($successIcon.querySelector('.sa-tip'), 'animateSuccessTip');
                    _hasClass$addClass$removeClass$escapeHtml$_show$show$_hide$hide$isDescendant$getTopMargin$fadeIn$fadeOut$fireClick$stopEventPropagation.removeClass($successIcon.querySelector('.sa-long'), 'animateSuccessLong');

                    var $errorIcon = modal.querySelector('.sa-icon.sa-error');
                    _hasClass$addClass$removeClass$escapeHtml$_show$show$_hide$hide$isDescendant$getTopMargin$fadeIn$fadeOut$fireClick$stopEventPropagation.removeClass($errorIcon, 'animateErrorIcon');
                    _hasClass$addClass$removeClass$escapeHtml$_show$show$_hide$hide$isDescendant$getTopMargin$fadeIn$fadeOut$fireClick$stopEventPropagation.removeClass($errorIcon.querySelector('.sa-x-mark'), 'animateXMark');

                    var $warningIcon = modal.querySelector('.sa-icon.sa-warning');
                    _hasClass$addClass$removeClass$escapeHtml$_show$show$_hide$hide$isDescendant$getTopMargin$fadeIn$fadeOut$fireClick$stopEventPropagation.removeClass($warningIcon, 'pulseWarning');
                    _hasClass$addClass$removeClass$escapeHtml$_show$show$_hide$hide$isDescendant$getTopMargin$fadeIn$fadeOut$fireClick$stopEventPropagation.removeClass($warningIcon.querySelector('.sa-body'), 'pulseWarningIns');
                    _hasClass$addClass$removeClass$escapeHtml$_show$show$_hide$hide$isDescendant$getTopMargin$fadeIn$fadeOut$fireClick$stopEventPropagation.removeClass($warningIcon.querySelector('.sa-dot'), 'pulseWarningIns');

                    // Reset custom class (delay so that UI changes aren't visible)
                    setTimeout(function () {
                        var customClass = modal.getAttribute('data-custom-class');
                        _hasClass$addClass$removeClass$escapeHtml$_show$show$_hide$hide$isDescendant$getTopMargin$fadeIn$fadeOut$fireClick$stopEventPropagation.removeClass(modal, customClass);
                    }, 300);

                    // Make page scrollable again
                    _hasClass$addClass$removeClass$escapeHtml$_show$show$_hide$hide$isDescendant$getTopMargin$fadeIn$fadeOut$fireClick$stopEventPropagation.removeClass(document.body, 'stop-scrolling');

                    // Reset the page to its previous state
                    window.onkeydown = previousWindowKeyDown;
                    if (window.previousActiveElement) {
                        window.previousActiveElement.focus();
                    }
                    lastFocusedButton = undefined;
                    clearTimeout(modal.timeout);

                    return true;
                };

                /*
                 * Validation of the input field is done by user
                 * If something is wrong => call showInputError with errorMessage
                 */
                sweetAlert.showInputError = swal.showInputError = function (errorMessage) {
                    var modal = _sweetAlertInitialize$getModal$getOverlay$getInput$setFocusStyle$openModal$resetInput$fixVerticalPosition.getModal();

                    var $errorIcon = modal.querySelector('.sa-input-error');
                    _hasClass$addClass$removeClass$escapeHtml$_show$show$_hide$hide$isDescendant$getTopMargin$fadeIn$fadeOut$fireClick$stopEventPropagation.addClass($errorIcon, 'show');

                    var $errorContainer = modal.querySelector('.sa-error-container');
                    _hasClass$addClass$removeClass$escapeHtml$_show$show$_hide$hide$isDescendant$getTopMargin$fadeIn$fadeOut$fireClick$stopEventPropagation.addClass($errorContainer, 'show');

                    $errorContainer.querySelector('p').innerHTML = errorMessage;

                    setTimeout(function () {
                        sweetAlert.enableButtons();
                    }, 1);

                    modal.querySelector('input').focus();
                };

                /*
                 * Reset input error DOM elements
                 */
                sweetAlert.resetInputError = swal.resetInputError = function (event) {
                    // If press enter => ignore
                    if (event && event.keyCode === 13) {
                        return false;
                    }

                    var $modal = _sweetAlertInitialize$getModal$getOverlay$getInput$setFocusStyle$openModal$resetInput$fixVerticalPosition.getModal();

                    var $errorIcon = $modal.querySelector('.sa-input-error');
                    _hasClass$addClass$removeClass$escapeHtml$_show$show$_hide$hide$isDescendant$getTopMargin$fadeIn$fadeOut$fireClick$stopEventPropagation.removeClass($errorIcon, 'show');

                    var $errorContainer = $modal.querySelector('.sa-error-container');
                    _hasClass$addClass$removeClass$escapeHtml$_show$show$_hide$hide$isDescendant$getTopMargin$fadeIn$fadeOut$fireClick$stopEventPropagation.removeClass($errorContainer, 'show');
                };

                /*
                 * Disable confirm and cancel buttons
                 */
                sweetAlert.disableButtons = swal.disableButtons = function (event) {
                    var modal = _sweetAlertInitialize$getModal$getOverlay$getInput$setFocusStyle$openModal$resetInput$fixVerticalPosition.getModal();
                    var $confirmButton = modal.querySelector('button.confirm');
                    var $cancelButton = modal.querySelector('button.cancel');
                    $confirmButton.disabled = true;
                    $cancelButton.disabled = true;
                };

                /*
                 * Enable confirm and cancel buttons
                 */
                sweetAlert.enableButtons = swal.enableButtons = function (event) {
                    var modal = _sweetAlertInitialize$getModal$getOverlay$getInput$setFocusStyle$openModal$resetInput$fixVerticalPosition.getModal();
                    var $confirmButton = modal.querySelector('button.confirm');
                    var $cancelButton = modal.querySelector('button.cancel');
                    $confirmButton.disabled = false;
                    $cancelButton.disabled = false;
                };

                if (typeof window !== 'undefined') {
                    // The 'handle-click' module requires
                    // that 'sweetAlert' was set as global.
                    window.sweetAlert = window.swal = sweetAlert;
                } else {
                    _extend$hexToRgb$isIE8$logStr$colorLuminance.logStr('SweetAlert is a frontend module!');
                }

            }, {"./modules/default-params": 2, "./modules/handle-click": 3, "./modules/handle-dom": 4, "./modules/handle-key": 5, "./modules/handle-swal-dom": 6, "./modules/set-params": 8, "./modules/utils": 9}], 2: [function (require, module, exports) {
                'use strict';

                Object.defineProperty(exports, '__esModule', {
                    value: true
                });
                var defaultParams = {
                    title: '',
                    text: '',
                    type: null,
                    allowOutsideClick: false,
                    showConfirmButton: true,
                    showCancelButton: false,
                    closeOnConfirm: true,
                    closeOnCancel: true,
                    confirmButtonText: 'OK',
                    confirmButtonColor: '#8CD4F5',
                    cancelButtonText: 'Cancel',
                    imageUrl: null,
                    imageSize: null,
                    timer: null,
                    customClass: '',
                    html: false,
                    animation: true,
                    allowEscapeKey: true,
                    inputType: 'text',
                    inputPlaceholder: '',
                    inputValue: '',
                    showLoaderOnConfirm: false
                };

                exports['default'] = defaultParams;
                module.exports = exports['default'];

            }, {}], 3: [function (require, module, exports) {
                'use strict';

                Object.defineProperty(exports, '__esModule', {
                    value: true
                });

                var _colorLuminance = require('./utils');

                var _getModal = require('./handle-swal-dom');

                var _hasClass$isDescendant = require('./handle-dom');

                /*
                 * User clicked on "Confirm"/"OK" or "Cancel"
                 */
                var handleButton = function handleButton(event, params, modal) {
                    var e = event || window.event;
                    var target = e.target || e.srcElement;

                    var targetedConfirm = target.className.indexOf('confirm') !== -1;
                    var targetedOverlay = target.className.indexOf('sweet-overlay') !== -1;
                    var modalIsVisible = _hasClass$isDescendant.hasClass(modal, 'visible');
                    var doneFunctionExists = params.doneFunction && modal.getAttribute('data-has-done-function') === 'true';

                    // Since the user can change the background-color of the confirm button programmatically,
                    // we must calculate what the color should be on hover/active
                    var normalColor, hoverColor, activeColor;
                    if (targetedConfirm && params.confirmButtonColor) {
                        normalColor = params.confirmButtonColor;
                        hoverColor = _colorLuminance.colorLuminance(normalColor, -0.04);
                        activeColor = _colorLuminance.colorLuminance(normalColor, -0.14);
                    }

                    function shouldSetConfirmButtonColor(color) {
                        if (targetedConfirm && params.confirmButtonColor) {
                            target.style.backgroundColor = color;
                        }
                    }

                    switch (e.type) {
                        case 'mouseover':
                            shouldSetConfirmButtonColor(hoverColor);
                            break;

                        case 'mouseout':
                            shouldSetConfirmButtonColor(normalColor);
                            break;

                        case 'mousedown':
                            shouldSetConfirmButtonColor(activeColor);
                            break;

                        case 'mouseup':
                            shouldSetConfirmButtonColor(hoverColor);
                            break;

                        case 'focus':
                            var $confirmButton = modal.querySelector('button.confirm');
                            var $cancelButton = modal.querySelector('button.cancel');

                            if (targetedConfirm) {
                                $cancelButton.style.boxShadow = 'none';
                            } else {
                                $confirmButton.style.boxShadow = 'none';
                            }
                            break;

                        case 'click':
                            var clickedOnModal = modal === target;
                            var clickedOnModalChild = _hasClass$isDescendant.isDescendant(modal, target);

                            // Ignore click outside if allowOutsideClick is false
                            if (!clickedOnModal && !clickedOnModalChild && modalIsVisible && !params.allowOutsideClick) {
                                break;
                            }

                            if (targetedConfirm && doneFunctionExists && modalIsVisible) {
                                handleConfirm(modal, params);
                            } else if (doneFunctionExists && modalIsVisible || targetedOverlay) {
                                handleCancel(modal, params);
                            } else if (_hasClass$isDescendant.isDescendant(modal, target) && target.tagName === 'BUTTON') {
                                sweetAlert.close();
                            }
                            break;
                    }
                };

                /*
                 *  User clicked on "Confirm"/"OK"
                 */
                var handleConfirm = function handleConfirm(modal, params) {
                    var callbackValue = true;

                    if (_hasClass$isDescendant.hasClass(modal, 'show-input')) {
                        callbackValue = modal.querySelector('input').value;

                        if (!callbackValue) {
                            callbackValue = '';
                        }
                    }

                    params.doneFunction(callbackValue);

                    if (params.closeOnConfirm) {
                        sweetAlert.close();
                    }
                    // Disable cancel and confirm button if the parameter is true
                    if (params.showLoaderOnConfirm) {
                        sweetAlert.disableButtons();
                    }
                };

                /*
                 *  User clicked on "Cancel"
                 */
                var handleCancel = function handleCancel(modal, params) {
                    // Check if callback function expects a parameter (to track cancel actions)
                    var functionAsStr = String(params.doneFunction).replace(/\s/g, '');
                    var functionHandlesCancel = functionAsStr.substring(0, 9) === 'function(' && functionAsStr.substring(9, 10) !== ')';

                    if (functionHandlesCancel) {
                        params.doneFunction(false);
                    }

                    if (params.closeOnCancel) {
                        sweetAlert.close();
                    }
                };

                exports['default'] = {
                    handleButton: handleButton,
                    handleConfirm: handleConfirm,
                    handleCancel: handleCancel
                };
                module.exports = exports['default'];

            }, {"./handle-dom": 4, "./handle-swal-dom": 6, "./utils": 9}], 4: [function (require, module, exports) {
                'use strict';

                Object.defineProperty(exports, '__esModule', {
                    value: true
                });
                var hasClass = function hasClass(elem, className) {
                    return new RegExp(' ' + className + ' ').test(' ' + elem.className + ' ');
                };

                var addClass = function addClass(elem, className) {
                    if (!hasClass(elem, className)) {
                        elem.className += ' ' + className;
                    }
                };

                var removeClass = function removeClass(elem, className) {
                    var newClass = ' ' + elem.className.replace(/[\t\r\n]/g, ' ') + ' ';
                    if (hasClass(elem, className)) {
                        while (newClass.indexOf(' ' + className + ' ') >= 0) {
                            newClass = newClass.replace(' ' + className + ' ', ' ');
                        }
                        elem.className = newClass.replace(/^\s+|\s+$/g, '');
                    }
                };

                var escapeHtml = function escapeHtml(str) {
                    var div = document.createElement('div');
                    div.appendChild(document.createTextNode(str));
                    return div.innerHTML;
                };

                var _show = function _show(elem) {
                    elem.style.opacity = '';
                    elem.style.display = 'block';
                };

                var show = function show(elems) {
                    if (elems && !elems.length) {
                        return _show(elems);
                    }
                    for (var i = 0; i < elems.length; ++i) {
                        _show(elems[i]);
                    }
                };

                var _hide = function _hide(elem) {
                    elem.style.opacity = '';
                    elem.style.display = 'none';
                };

                var hide = function hide(elems) {
                    if (elems && !elems.length) {
                        return _hide(elems);
                    }
                    for (var i = 0; i < elems.length; ++i) {
                        _hide(elems[i]);
                    }
                };

                var isDescendant = function isDescendant(parent, child) {
                    var node = child.parentNode;
                    while (node !== null) {
                        if (node === parent) {
                            return true;
                        }
                        node = node.parentNode;
                    }
                    return false;
                };

                var getTopMargin = function getTopMargin(elem) {
                    elem.style.left = '-9999px';
                    elem.style.display = 'block';

                    var height = elem.clientHeight,
                            padding;
                    if (typeof getComputedStyle !== 'undefined') {
                        // IE 8
                        padding = parseInt(getComputedStyle(elem).getPropertyValue('padding-top'), 10);
                    } else {
                        padding = parseInt(elem.currentStyle.padding);
                    }

                    elem.style.left = '';
                    elem.style.display = 'none';
                    return '-' + parseInt((height + padding) / 2) + 'px';
                };

                var fadeIn = function fadeIn(elem, interval) {
                    if (+elem.style.opacity < 1) {
                        interval = interval || 16;
                        elem.style.opacity = 0;
                        elem.style.display = 'block';
                        var last = +new Date();
                        var tick = (function (_tick) {
                            function tick() {
                                return _tick.apply(this, arguments);
                            }

                            tick.toString = function () {
                                return _tick.toString();
                            };

                            return tick;
                        })(function () {
                            elem.style.opacity = +elem.style.opacity + (new Date() - last) / 100;
                            last = +new Date();

                            if (+elem.style.opacity < 1) {
                                setTimeout(tick, interval);
                            }
                        });
                        tick();
                    }
                    elem.style.display = 'block'; //fallback IE8
                };

                var fadeOut = function fadeOut(elem, interval) {
                    interval = interval || 16;
                    elem.style.opacity = 1;
                    var last = +new Date();
                    var tick = (function (_tick2) {
                        function tick() {
                            return _tick2.apply(this, arguments);
                        }

                        tick.toString = function () {
                            return _tick2.toString();
                        };

                        return tick;
                    })(function () {
                        elem.style.opacity = +elem.style.opacity - (new Date() - last) / 100;
                        last = +new Date();

                        if (+elem.style.opacity > 0) {
                            setTimeout(tick, interval);
                        } else {
                            elem.style.display = 'none';
                        }
                    });
                    tick();
                };

                var fireClick = function fireClick(node) {
                    // Taken from http://www.nonobtrusive.com/2011/11/29/programatically-fire-crossbrowser-click-event-with-javascript/
                    // Then fixed for today's Chrome browser.
                    if (typeof MouseEvent === 'function') {
                        // Up-to-date approach
                        var mevt = new MouseEvent('click', {
                            view: window,
                            bubbles: false,
                            cancelable: true
                        });
                        node.dispatchEvent(mevt);
                    } else if (document.createEvent) {
                        // Fallback
                        var evt = document.createEvent('MouseEvents');
                        evt.initEvent('click', false, false);
                        node.dispatchEvent(evt);
                    } else if (document.createEventObject) {
                        node.fireEvent('onclick');
                    } else if (typeof node.onclick === 'function') {
                        node.onclick();
                    }
                };

                var stopEventPropagation = function stopEventPropagation(e) {
                    // In particular, make sure the space bar doesn't scroll the main window.
                    if (typeof e.stopPropagation === 'function') {
                        e.stopPropagation();
                        e.preventDefault();
                    } else if (window.event && window.event.hasOwnProperty('cancelBubble')) {
                        window.event.cancelBubble = true;
                    }
                };

                exports.hasClass = hasClass;
                exports.addClass = addClass;
                exports.removeClass = removeClass;
                exports.escapeHtml = escapeHtml;
                exports._show = _show;
                exports.show = show;
                exports._hide = _hide;
                exports.hide = hide;
                exports.isDescendant = isDescendant;
                exports.getTopMargin = getTopMargin;
                exports.fadeIn = fadeIn;
                exports.fadeOut = fadeOut;
                exports.fireClick = fireClick;
                exports.stopEventPropagation = stopEventPropagation;

            }, {}], 5: [function (require, module, exports) {
                'use strict';

                Object.defineProperty(exports, '__esModule', {
                    value: true
                });

                var _stopEventPropagation$fireClick = require('./handle-dom');

                var _setFocusStyle = require('./handle-swal-dom');

                var handleKeyDown = function handleKeyDown(event, params, modal) {
                    var e = event || window.event;
                    var keyCode = e.keyCode || e.which;

                    var $okButton = modal.querySelector('button.confirm');
                    var $cancelButton = modal.querySelector('button.cancel');
                    var $modalButtons = modal.querySelectorAll('button[tabindex]');

                    if ([9, 13, 32, 27].indexOf(keyCode) === -1) {
                        // Don't do work on keys we don't care about.
                        return;
                    }

                    var $targetElement = e.target || e.srcElement;

                    var btnIndex = -1; // Find the button - note, this is a nodelist, not an array.
                    for (var i = 0; i < $modalButtons.length; i++) {
                        if ($targetElement === $modalButtons[i]) {
                            btnIndex = i;
                            break;
                        }
                    }

                    if (keyCode === 9) {
                        // TAB
                        if (btnIndex === -1) {
                            // No button focused. Jump to the confirm button.
                            $targetElement = $okButton;
                        } else {
                            // Cycle to the next button
                            if (btnIndex === $modalButtons.length - 1) {
                                $targetElement = $modalButtons[0];
                            } else {
                                $targetElement = $modalButtons[btnIndex + 1];
                            }
                        }

                        _stopEventPropagation$fireClick.stopEventPropagation(e);
                        $targetElement.focus();

                        if (params.confirmButtonColor) {
                            _setFocusStyle.setFocusStyle($targetElement, params.confirmButtonColor);
                        }
                    } else {
                        if (keyCode === 13) {
                            if ($targetElement.tagName === 'INPUT') {
                                $targetElement = $okButton;
                                $okButton.focus();
                            }

                            if (btnIndex === -1) {
                                // ENTER/SPACE clicked outside of a button.
                                $targetElement = $okButton;
                            } else {
                                // Do nothing - let the browser handle it.
                                $targetElement = undefined;
                            }
                        } else if (keyCode === 27 && params.allowEscapeKey === true) {
                            $targetElement = $cancelButton;
                            _stopEventPropagation$fireClick.fireClick($targetElement, e);
                        } else {
                            // Fallback - let the browser handle it.
                            $targetElement = undefined;
                        }
                    }
                };

                exports['default'] = handleKeyDown;
                module.exports = exports['default'];

            }, {"./handle-dom": 4, "./handle-swal-dom": 6}], 6: [function (require, module, exports) {
                'use strict';

                var _interopRequireWildcard = function (obj) {
                    return obj && obj.__esModule ? obj : {'default': obj};
                };

                Object.defineProperty(exports, '__esModule', {
                    value: true
                });

                var _hexToRgb = require('./utils');

                var _removeClass$getTopMargin$fadeIn$show$addClass = require('./handle-dom');

                var _defaultParams = require('./default-params');

                var _defaultParams2 = _interopRequireWildcard(_defaultParams);

                /*
                 * Add modal + overlay to DOM
                 */

                var _injectedHTML = require('./injected-html');

                var _injectedHTML2 = _interopRequireWildcard(_injectedHTML);

                var modalClass = '.sweet-alert';
                var overlayClass = '.sweet-overlay';

                var sweetAlertInitialize = function sweetAlertInitialize() {
                    var sweetWrap = document.createElement('div');
                    sweetWrap.innerHTML = _injectedHTML2['default'];

                    // Append elements to body
                    while (sweetWrap.firstChild) {
                        document.body.appendChild(sweetWrap.firstChild);
                    }
                };

                /*
                 * Get DOM element of modal
                 */
                var getModal = (function (_getModal) {
                    function getModal() {
                        return _getModal.apply(this, arguments);
                    }

                    getModal.toString = function () {
                        return _getModal.toString();
                    };

                    return getModal;
                })(function () {
                    var $modal = document.querySelector(modalClass);

                    if (!$modal) {
                        sweetAlertInitialize();
                        $modal = getModal();
                    }

                    return $modal;
                });

                /*
                 * Get DOM element of input (in modal)
                 */
                var getInput = function getInput() {
                    var $modal = getModal();
                    if ($modal) {
                        return $modal.querySelector('input');
                    }
                };

                /*
                 * Get DOM element of overlay
                 */
                var getOverlay = function getOverlay() {
                    return document.querySelector(overlayClass);
                };

                /*
                 * Add box-shadow style to button (depending on its chosen bg-color)
                 */
                var setFocusStyle = function setFocusStyle($button, bgColor) {
                    var rgbColor = _hexToRgb.hexToRgb(bgColor);
                    $button.style.boxShadow = '0 0 2px rgba(' + rgbColor + ', 0.8), inset 0 0 0 1px rgba(0, 0, 0, 0.05)';
                };

                /*
                 * Animation when opening modal
                 */
                var openModal = function openModal(callback) {
                    var $modal = getModal();
                    _removeClass$getTopMargin$fadeIn$show$addClass.fadeIn(getOverlay(), 10);
                    _removeClass$getTopMargin$fadeIn$show$addClass.show($modal);
                    _removeClass$getTopMargin$fadeIn$show$addClass.addClass($modal, 'showSweetAlert');
                    _removeClass$getTopMargin$fadeIn$show$addClass.removeClass($modal, 'hideSweetAlert');

                    window.previousActiveElement = document.activeElement;
                    var $okButton = $modal.querySelector('button.confirm');
                    $okButton.focus();

                    setTimeout(function () {
                        _removeClass$getTopMargin$fadeIn$show$addClass.addClass($modal, 'visible');
                    }, 500);

                    var timer = $modal.getAttribute('data-timer');

                    if (timer !== 'null' && timer !== '') {
                        var timerCallback = callback;
                        $modal.timeout = setTimeout(function () {
                            var doneFunctionExists = (timerCallback || null) && $modal.getAttribute('data-has-done-function') === 'true';
                            if (doneFunctionExists) {
                                timerCallback(null);
                            } else {
                                sweetAlert.close();
                            }
                        }, timer);
                    }
                };

                /*
                 * Reset the styling of the input
                 * (for example if errors have been shown)
                 */
                var resetInput = function resetInput() {
                    var $modal = getModal();
                    var $input = getInput();

                    _removeClass$getTopMargin$fadeIn$show$addClass.removeClass($modal, 'show-input');
                    $input.value = _defaultParams2['default'].inputValue;
                    $input.setAttribute('type', _defaultParams2['default'].inputType);
                    $input.setAttribute('placeholder', _defaultParams2['default'].inputPlaceholder);

                    resetInputError();
                };

                var resetInputError = function resetInputError(event) {
                    // If press enter => ignore
                    if (event && event.keyCode === 13) {
                        return false;
                    }

                    var $modal = getModal();

                    var $errorIcon = $modal.querySelector('.sa-input-error');
                    _removeClass$getTopMargin$fadeIn$show$addClass.removeClass($errorIcon, 'show');

                    var $errorContainer = $modal.querySelector('.sa-error-container');
                    _removeClass$getTopMargin$fadeIn$show$addClass.removeClass($errorContainer, 'show');
                };

                /*
                 * Set "margin-top"-property on modal based on its computed height
                 */
                var fixVerticalPosition = function fixVerticalPosition() {
                    var $modal = getModal();
                    $modal.style.marginTop = _removeClass$getTopMargin$fadeIn$show$addClass.getTopMargin(getModal());
                };

                exports.sweetAlertInitialize = sweetAlertInitialize;
                exports.getModal = getModal;
                exports.getOverlay = getOverlay;
                exports.getInput = getInput;
                exports.setFocusStyle = setFocusStyle;
                exports.openModal = openModal;
                exports.resetInput = resetInput;
                exports.resetInputError = resetInputError;
                exports.fixVerticalPosition = fixVerticalPosition;

            }, {"./default-params": 2, "./handle-dom": 4, "./injected-html": 7, "./utils": 9}], 7: [function (require, module, exports) {
                "use strict";

                Object.defineProperty(exports, "__esModule", {
                    value: true
                });
                var injectedHTML =
// Dark overlay
                        "<div class=\"sweet-overlay\" tabIndex=\"-1\"></div>" +
// Modal
                        "<div class=\"sweet-alert\">" +
// Error icon
                        "<div class=\"sa-icon sa-error\">\n      <span class=\"sa-x-mark\">\n        <span class=\"sa-line sa-left\"></span>\n        <span class=\"sa-line sa-right\"></span>\n      </span>\n    </div>" +
// Warning icon
                        "<div class=\"sa-icon sa-warning\">\n      <span class=\"sa-body\"></span>\n      <span class=\"sa-dot\"></span>\n    </div>" +
// Info icon
                        "<div class=\"sa-icon sa-info\"></div>" +
// Success icon
                        "<div class=\"sa-icon sa-success\">\n      <span class=\"sa-line sa-tip\"></span>\n      <span class=\"sa-line sa-long\"></span>\n\n      <div class=\"sa-placeholder\"></div>\n      <div class=\"sa-fix\"></div>\n    </div>" + "<div class=\"sa-icon sa-custom\"></div>" +
// Title, text and input
                        "<h2>Title</h2>\n    <p>Text</p>\n    <fieldset>\n      <input type=\"text\" tabIndex=\"3\" />\n      <div class=\"sa-input-error\"></div>\n    </fieldset>" +
// Input errors
                        "<div class=\"sa-error-container\">\n      <div class=\"icon\">!</div>\n      <p>Not valid!</p>\n    </div>" +
// Cancel and confirm buttons
                        "<div class=\"sa-button-container\">\n      <button class=\"cancel\" tabIndex=\"2\">Cancel</button>\n      <div class=\"sa-confirm-button-container\">\n        <button class=\"confirm\" tabIndex=\"1\">OK</button>" +
// Loading animation
                        "<div class=\"la-ball-fall\">\n          <div></div>\n          <div></div>\n          <div></div>\n        </div>\n      </div>\n    </div>" +
// End of modal
                        "</div>";

                exports["default"] = injectedHTML;
                module.exports = exports["default"];

            }, {}], 8: [function (require, module, exports) {
                'use strict';

                Object.defineProperty(exports, '__esModule', {
                    value: true
                });

                var _isIE8 = require('./utils');

                var _getModal$getInput$setFocusStyle = require('./handle-swal-dom');

                var _hasClass$addClass$removeClass$escapeHtml$_show$show$_hide$hide = require('./handle-dom');

                var alertTypes = ['error', 'warning', 'info', 'success', 'input', 'prompt'];

                /*
                 * Set type, text and actions on modal
                 */
                var setParameters = function setParameters(params) {
                    var modal = _getModal$getInput$setFocusStyle.getModal();

                    var $title = modal.querySelector('h2');
                    var $text = modal.querySelector('p');
                    var $cancelBtn = modal.querySelector('button.cancel');
                    var $confirmBtn = modal.querySelector('button.confirm');

                    /*
                     * Title
                     */
                    $title.innerHTML = params.html ? params.title : _hasClass$addClass$removeClass$escapeHtml$_show$show$_hide$hide.escapeHtml(params.title).split('\n').join('<br>');

                    /*
                     * Text
                     */
                    $text.innerHTML = params.html ? params.text : _hasClass$addClass$removeClass$escapeHtml$_show$show$_hide$hide.escapeHtml(params.text || '').split('\n').join('<br>');
                    if (params.text)
                        _hasClass$addClass$removeClass$escapeHtml$_show$show$_hide$hide.show($text);

                    /*
                     * Custom class
                     */
                    if (params.customClass) {
                        _hasClass$addClass$removeClass$escapeHtml$_show$show$_hide$hide.addClass(modal, params.customClass);
                        modal.setAttribute('data-custom-class', params.customClass);
                    } else {
                        // Find previously set classes and remove them
                        var customClass = modal.getAttribute('data-custom-class');
                        _hasClass$addClass$removeClass$escapeHtml$_show$show$_hide$hide.removeClass(modal, customClass);
                        modal.setAttribute('data-custom-class', '');
                    }

                    /*
                     * Icon
                     */
                    _hasClass$addClass$removeClass$escapeHtml$_show$show$_hide$hide.hide(modal.querySelectorAll('.sa-icon'));

                    if (params.type && !_isIE8.isIE8()) {
                        var _ret = (function () {

                            var validType = false;

                            for (var i = 0; i < alertTypes.length; i++) {
                                if (params.type === alertTypes[i]) {
                                    validType = true;
                                    break;
                                }
                            }

                            if (!validType) {
                                logStr('Unknown alert type: ' + params.type);
                                return {
                                    v: false
                                };
                            }

                            var typesWithIcons = ['success', 'error', 'warning', 'info'];
                            var $icon = undefined;

                            if (typesWithIcons.indexOf(params.type) !== -1) {
                                $icon = modal.querySelector('.sa-icon.' + 'sa-' + params.type);
                                _hasClass$addClass$removeClass$escapeHtml$_show$show$_hide$hide.show($icon);
                            }

                            var $input = _getModal$getInput$setFocusStyle.getInput();

                            // Animate icon
                            switch (params.type) {

                                case 'success':
                                    _hasClass$addClass$removeClass$escapeHtml$_show$show$_hide$hide.addClass($icon, 'animate');
                                    _hasClass$addClass$removeClass$escapeHtml$_show$show$_hide$hide.addClass($icon.querySelector('.sa-tip'), 'animateSuccessTip');
                                    _hasClass$addClass$removeClass$escapeHtml$_show$show$_hide$hide.addClass($icon.querySelector('.sa-long'), 'animateSuccessLong');
                                    break;

                                case 'error':
                                    _hasClass$addClass$removeClass$escapeHtml$_show$show$_hide$hide.addClass($icon, 'animateErrorIcon');
                                    _hasClass$addClass$removeClass$escapeHtml$_show$show$_hide$hide.addClass($icon.querySelector('.sa-x-mark'), 'animateXMark');
                                    break;

                                case 'warning':
                                    _hasClass$addClass$removeClass$escapeHtml$_show$show$_hide$hide.addClass($icon, 'pulseWarning');
                                    _hasClass$addClass$removeClass$escapeHtml$_show$show$_hide$hide.addClass($icon.querySelector('.sa-body'), 'pulseWarningIns');
                                    _hasClass$addClass$removeClass$escapeHtml$_show$show$_hide$hide.addClass($icon.querySelector('.sa-dot'), 'pulseWarningIns');
                                    break;

                                case 'input':
                                case 'prompt':
                                    $input.setAttribute('type', params.inputType);
                                    $input.value = params.inputValue;
                                    $input.setAttribute('placeholder', params.inputPlaceholder);
                                    _hasClass$addClass$removeClass$escapeHtml$_show$show$_hide$hide.addClass(modal, 'show-input');
                                    setTimeout(function () {
                                        $input.focus();
                                        $input.addEventListener('keyup', swal.resetInputError);
                                    }, 400);
                                    break;
                            }
                        })();

                        if (typeof _ret === 'object') {
                            return _ret.v;
                        }
                    }

                    /*
                     * Custom image
                     */
                    if (params.imageUrl) {
                        var $customIcon = modal.querySelector('.sa-icon.sa-custom');

                        $customIcon.style.backgroundImage = 'url(' + params.imageUrl + ')';
                        _hasClass$addClass$removeClass$escapeHtml$_show$show$_hide$hide.show($customIcon);

                        var _imgWidth = 80;
                        var _imgHeight = 80;

                        if (params.imageSize) {
                            var dimensions = params.imageSize.toString().split('x');
                            var imgWidth = dimensions[0];
                            var imgHeight = dimensions[1];

                            if (!imgWidth || !imgHeight) {
                                logStr('Parameter imageSize expects value with format WIDTHxHEIGHT, got ' + params.imageSize);
                            } else {
                                _imgWidth = imgWidth;
                                _imgHeight = imgHeight;
                            }
                        }

                        $customIcon.setAttribute('style', $customIcon.getAttribute('style') + 'width:' + _imgWidth + 'px; height:' + _imgHeight + 'px');
                    }

                    /*
                     * Show cancel button?
                     */
                    modal.setAttribute('data-has-cancel-button', params.showCancelButton);
                    if (params.showCancelButton) {
                        $cancelBtn.style.display = 'inline-block';
                    } else {
                        _hasClass$addClass$removeClass$escapeHtml$_show$show$_hide$hide.hide($cancelBtn);
                    }

                    /*
                     * Show confirm button?
                     */
                    modal.setAttribute('data-has-confirm-button', params.showConfirmButton);
                    if (params.showConfirmButton) {
                        $confirmBtn.style.display = 'inline-block';
                    } else {
                        _hasClass$addClass$removeClass$escapeHtml$_show$show$_hide$hide.hide($confirmBtn);
                    }

                    /*
                     * Custom text on cancel/confirm buttons
                     */
                    if (params.cancelButtonText) {
                        $cancelBtn.innerHTML = _hasClass$addClass$removeClass$escapeHtml$_show$show$_hide$hide.escapeHtml(params.cancelButtonText);
                    }
                    if (params.confirmButtonText) {
                        $confirmBtn.innerHTML = _hasClass$addClass$removeClass$escapeHtml$_show$show$_hide$hide.escapeHtml(params.confirmButtonText);
                    }

                    /*
                     * Custom color on confirm button
                     */
                    if (params.confirmButtonColor) {
                        // Set confirm button to selected background color
                        $confirmBtn.style.backgroundColor = params.confirmButtonColor;

                        // Set the confirm button color to the loading ring
                        $confirmBtn.style.borderLeftColor = params.confirmLoadingButtonColor;
                        $confirmBtn.style.borderRightColor = params.confirmLoadingButtonColor;

                        // Set box-shadow to default focused button
                        _getModal$getInput$setFocusStyle.setFocusStyle($confirmBtn, params.confirmButtonColor);
                    }

                    /*
                     * Allow outside click
                     */
                    modal.setAttribute('data-allow-outside-click', params.allowOutsideClick);

                    /*
                     * Callback function
                     */
                    var hasDoneFunction = params.doneFunction ? true : false;
                    modal.setAttribute('data-has-done-function', hasDoneFunction);

                    /*
                     * Animation
                     */
                    if (!params.animation) {
                        modal.setAttribute('data-animation', 'none');
                    } else if (typeof params.animation === 'string') {
                        modal.setAttribute('data-animation', params.animation); // Custom animation
                    } else {
                        modal.setAttribute('data-animation', 'pop');
                    }

                    /*
                     * Timer
                     */
                    modal.setAttribute('data-timer', params.timer);
                };

                exports['default'] = setParameters;
                module.exports = exports['default'];

            }, {"./handle-dom": 4, "./handle-swal-dom": 6, "./utils": 9}], 9: [function (require, module, exports) {
                'use strict';

                Object.defineProperty(exports, '__esModule', {
                    value: true
                });
                /*
                 * Allow user to pass their own params
                 */
                var extend = function extend(a, b) {
                    for (var key in b) {
                        if (b.hasOwnProperty(key)) {
                            a[key] = b[key];
                        }
                    }
                    return a;
                };

                /*
                 * Convert HEX codes to RGB values (#000000 -> rgb(0,0,0))
                 */
                var hexToRgb = function hexToRgb(hex) {
                    var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
                    return result ? parseInt(result[1], 16) + ', ' + parseInt(result[2], 16) + ', ' + parseInt(result[3], 16) : null;
                };

                /*
                 * Check if the user is using Internet Explorer 8 (for fallbacks)
                 */
                var isIE8 = function isIE8() {
                    return window.attachEvent && !window.addEventListener;
                };

                /*
                 * IE compatible logging for developers
                 */
                var logStr = function logStr(string) {
                    if (window.console) {
                        // IE...
                        void 0;
                    }
                };

                /*
                 * Set hover, active and focus-states for buttons
                 * (source: http://www.sitepoint.com/javascript-generate-lighter-darker-color)
                 */
                var colorLuminance = function colorLuminance(hex, lum) {
                    // Validate hex string
                    hex = String(hex).replace(/[^0-9a-f]/gi, '');
                    if (hex.length < 6) {
                        hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
                    }
                    lum = lum || 0;

                    // Convert to decimal and change luminosity
                    var rgb = '#';
                    var c;
                    var i;

                    for (i = 0; i < 3; i++) {
                        c = parseInt(hex.substr(i * 2, 2), 16);
                        c = Math.round(Math.min(Math.max(0, c + c * lum), 255)).toString(16);
                        rgb += ('00' + c).substr(c.length);
                    }

                    return rgb;
                };

                exports.extend = extend;
                exports.hexToRgb = hexToRgb;
                exports.isIE8 = isIE8;
                exports.logStr = logStr;
                exports.colorLuminance = colorLuminance;

            }, {}]}, {}, [1])
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCIvVXNlcnMvVHJpc3Rhbi9kZXYvU3dlZXRBbGVydC9kZXYvc3dlZXRhbGVydC5lczYuanMiLCIvVXNlcnMvVHJpc3Rhbi9kZXYvU3dlZXRBbGVydC9kZXYvbW9kdWxlcy9kZWZhdWx0LXBhcmFtcy5qcyIsIi9Vc2Vycy9UcmlzdGFuL2Rldi9Td2VldEFsZXJ0L2Rldi9tb2R1bGVzL2hhbmRsZS1jbGljay5qcyIsIi9Vc2Vycy9UcmlzdGFuL2Rldi9Td2VldEFsZXJ0L2Rldi9tb2R1bGVzL2hhbmRsZS1kb20uanMiLCIvVXNlcnMvVHJpc3Rhbi9kZXYvU3dlZXRBbGVydC9kZXYvbW9kdWxlcy9oYW5kbGUta2V5LmpzIiwiL1VzZXJzL1RyaXN0YW4vZGV2L1N3ZWV0QWxlcnQvZGV2L21vZHVsZXMvaGFuZGxlLXN3YWwtZG9tLmpzIiwiL1VzZXJzL1RyaXN0YW4vZGV2L1N3ZWV0QWxlcnQvZGV2L21vZHVsZXMvaW5qZWN0ZWQtaHRtbC5qcyIsIi9Vc2Vycy9UcmlzdGFuL2Rldi9Td2VldEFsZXJ0L2Rldi9tb2R1bGVzL3NldC1wYXJhbXMuanMiLCIvVXNlcnMvVHJpc3Rhbi9kZXYvU3dlZXRBbGVydC9kZXYvbW9kdWxlcy91dGlscy5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7Ozs7Ozs7OztzSkNnQk8sc0JBQXNCOzs7Ozs7MkRBV3RCLGlCQUFpQjs7Ozs7O3dIQWNqQiwyQkFBMkI7Ozs7dURBSXdCLHdCQUF3Qjs7NkJBQ3hELHNCQUFzQjs7Ozs7OzZCQUl0QiwwQkFBMEI7Ozs7NkJBQzFCLHNCQUFzQjs7Ozs7Ozs7QUFNaEQsSUFBSSxxQkFBcUIsQ0FBQztBQUMxQixJQUFJLGlCQUFpQixDQUFDOzs7Ozs7QUFPdEIsSUFBSSxVQUFVLEVBQUUsSUFBSSxDQUFDOztBQUVyQixVQUFVLEdBQUcsSUFBSSxHQUFHLFlBQVc7QUFD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QUcsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxHQUFHLENBQUMsR0FBRyxHQUFHLENBQUMsRUFBRSxHQUFHLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxFQUFFLENBQUMsQ0FBQztBQUNyRSxPQUFHLElBQUksQ0FBQyxJQUFJLEdBQUcsQ0FBQyxDQUFBLENBQUUsTUFBTSxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQztHQUNwQzs7QUFFRCxTQUFPLEdBQUcsQ0FBQztDQUNaLENBQUM7O1FBSUEsTUFBTSxHQUFOLE1BQU07UUFDTixRQUFRLEdBQVIsUUFBUTtRQUNSLEtBQUssR0FBTCxLQUFLO1FBQ0wsTUFBTSxHQUFOLE1BQU07UUFDTixjQUFjLEdBQWQsY0FBYyIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt2YXIgZj1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpO3Rocm93IGYuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixmfXZhciBsPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChsLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGwsbC5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCIvLyBTd2VldEFsZXJ0XG4vLyAyMDE0LTIwMTUgKGMpIC0gVHJpc3RhbiBFZHdhcmRzXG4vLyBnaXRodWIuY29tL3Q0dDUvc3dlZXRhbGVydFxuXG4vKlxuICogalF1ZXJ5LWxpa2UgZnVuY3Rpb25zIGZvciBtYW5pcHVsYXRpbmcgdGhlIERPTVxuICovXG5pbXBvcnQge1xuICBoYXNDbGFzcywgYWRkQ2xhc3MsIHJlbW92ZUNsYXNzLFxuICBlc2NhcGVIdG1sLFxuICBfc2hvdywgc2hvdywgX2hpZGUsIGhpZGUsXG4gIGlzRGVzY2VuZGFudCxcbiAgZ2V0VG9wTWFyZ2luLFxuICBmYWRlSW4sIGZhZGVPdXQsXG4gIGZpcmVDbGljayxcbiAgc3RvcEV2ZW50UHJvcGFnYXRpb25cbn0gZnJvbSAnLi9tb2R1bGVzL2hhbmRsZS1kb20nO1xuXG4vKlxuICogSGFuZHkgdXRpbGl0aWVzXG4gKi9cbmltcG9ydCB7XG4gIGV4dGVuZCxcbiAgaGV4VG9SZ2IsXG4gIGlzSUU4LFxuICBsb2dTdHIsXG4gIGNvbG9yTHVtaW5hbmNlXG59IGZyb20gJy4vbW9kdWxlcy91dGlscyc7XG5cbi8qXG4gKiAgSGFuZGxlIHN3ZWV0QWxlcnQncyBET00gZWxlbWVudHNcbiAqL1xuaW1wb3J0IHtcbiAgc3dlZXRBbGVydEluaXRpYWxpemUsXG4gIGdldE1vZGFsLFxuICBnZXRPdmVybGF5LFxuICBnZXRJbnB1dCxcbiAgc2V0Rm9jdXNTdHlsZSxcbiAgb3Blbk1vZGFsLFxuICByZXNldElucHV0LFxuICBmaXhWZXJ0aWNhbFBvc2l0aW9uXG59IGZyb20gJy4vbW9kdWxlcy9oYW5kbGUtc3dhbC1kb20nO1xuXG5cbi8vIEhhbmRsZSBidXR0b24gZXZlbnRzIGFuZCBrZXlib2FyZCBldmVudHNcbmltcG9ydCB7IGhhbmRsZUJ1dHRvbiwgaGFuZGxlQ29uZmlybSwgaGFuZGxlQ2FuY2VsIH0gZnJvbSAnLi9tb2R1bGVzL2hhbmRsZS1jbGljayc7XG5pbXBvcnQgaGFuZGxlS2V5RG93biBmcm9tICcuL21vZHVsZXMvaGFuZGxlLWtleSc7XG5cblxuLy8gRGVmYXVsdCB2YWx1ZXNcbmltcG9ydCBkZWZhdWx0UGFyYW1zIGZyb20gJy4vbW9kdWxlcy9kZWZhdWx0LXBhcmFtcyc7XG5pbXBvcnQgc2V0UGFyYW1ldGVycyBmcm9tICcuL21vZHVsZXMvc2V0LXBhcmFtcyc7XG5cbi8qXG4gKiBSZW1lbWJlciBzdGF0ZSBpbiBjYXNlcyB3aGVyZSBvcGVuaW5nIGFuZCBoYW5kbGluZyBhIG1vZGFsIHdpbGwgZmlkZGxlIHdpdGggaXQuXG4gKiAoV2UgYWxzbyB1c2Ugd2luZG93LnByZXZpb3VzQWN0aXZlRWxlbWVudCBhcyBhIGdsb2JhbCB2YXJpYWJsZSlcbiAqL1xudmFyIHByZXZpb3VzV2luZG93S2V5RG93bjtcbnZhciBsYXN0Rm9jdXNlZEJ1dHRvbjtcblxuXG4vKlxuICogR2xvYmFsIHN3ZWV0QWxlcnQgZnVuY3Rpb25cbiAqICh0aGlzIGlzIHdoYXQgdGhlIHVzZXIgY2FsbHMpXG4gKi9cbnZhciBzd2VldEFsZXJ0LCBzd2FsO1xuXG5zd2VldEFsZXJ0ID0gc3dhbCA9IGZ1bmN0aW9uKCkge1xuICB2YXIgY3VzdG9taXphdGlvbnMgPSBhcmd1bWVudHNbMF07XG5cbiAgYWRkQ2xhc3MoZG9jdW1lbnQuYm9keSwgJ3N0b3Atc2Nyb2xsaW5nJyk7XG4gIHJlc2V0SW5wdXQoKTtcblxuICAvKlxuICAgKiBVc2UgYXJndW1lbnQgaWYgZGVmaW5lZCBvciBkZWZhdWx0IHZhbHVlIGZyb20gcGFyYW1zIG9iamVjdCBvdGhlcndpc2UuXG4gICAqIFN1cHBvcnRzIHRoZSBjYXNlIHdoZXJlIGEgZGVmYXVsdCB2YWx1ZSBpcyBib29sZWFuIHRydWUgYW5kIHNob3VsZCBiZVxuICAgKiBvdmVycmlkZGVuIGJ5IGEgY29ycmVzcG9uZGluZyBleHBsaWNpdCBhcmd1bWVudCB3aGljaCBpcyBib29sZWFuIGZhbHNlLlxuICAgKi9cbiAgZnVuY3Rpb24gYXJndW1lbnRPckRlZmF1bHQoa2V5KSB7XG4gICAgdmFyIGFyZ3MgPSBjdXN0b21pemF0aW9ucztcbiAgICByZXR1cm4gKGFyZ3Nba2V5XSA9PT0gdW5kZWZpbmVkKSA/ICBkZWZhdWx0UGFyYW1zW2tleV0gOiBhcmdzW2tleV07XG4gIH1cblxuICBpZiAoY3VzdG9taXphdGlvbnMgPT09IHVuZGVmaW5lZCkge1xuICAgIGxvZ1N0cignU3dlZXRBbGVydCBleHBlY3RzIGF0IGxlYXN0IDEgYXR0cmlidXRlIScpO1xuICAgIHJldHVybiBmYWxzZTtcbiAgfVxuXG4gIHZhciBwYXJhbXMgPSBleHRlbmQoe30sIGRlZmF1bHRQYXJhbXMpO1xuXG4gIHN3aXRjaCAodHlwZW9mIGN1c3RvbWl6YXRpb25zKSB7XG5cbiAgICAvLyBFeDogc3dhbChcIkhlbGxvXCIsIFwiSnVzdCB0ZXN0aW5nXCIsIFwiaW5mb1wiKTtcbiAgICBjYXNlICdzdHJpbmcnOlxuICAgICAgcGFyYW1zLnRpdGxlID0gY3VzdG9taXphdGlvbnM7XG4gICAgICBwYXJhbXMudGV4dCAgPSBhcmd1bWVudHNbMV0gfHwgJyc7XG4gICAgICBwYXJhbXMudHlwZSAgPSBhcmd1bWVudHNbMl0gfHwgJyc7XG4gICAgICBicmVhaztcblxuICAgIC8vIEV4OiBzd2FsKHsgdGl0bGU6XCJIZWxsb1wiLCB0ZXh0OiBcIkp1c3QgdGVzdGluZ1wiLCB0eXBlOiBcImluZm9cIiB9KTtcbiAgICBjYXNlICdvYmplY3QnOlxuICAgICAgaWYgKGN1c3RvbWl6YXRpb25zLnRpdGxlID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgbG9nU3RyKCdNaXNzaW5nIFwidGl0bGVcIiBhcmd1bWVudCEnKTtcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgfVxuXG4gICAgICBwYXJhbXMudGl0bGUgPSBjdXN0b21pemF0aW9ucy50aXRsZTtcblxuICAgICAgZm9yIChsZXQgY3VzdG9tTmFtZSBpbiBkZWZhdWx0UGFyYW1zKSB7XG4gICAgICAgIHBhcmFtc1tjdXN0b21OYW1lXSA9IGFyZ3VtZW50T3JEZWZhdWx0KGN1c3RvbU5hbWUpO1xuICAgICAgfVxuXG4gICAgICAvLyBTaG93IFwiQ29uZmlybVwiIGluc3RlYWQgb2YgXCJPS1wiIGlmIGNhbmNlbCBidXR0b24gaXMgdmlzaWJsZVxuICAgICAgcGFyYW1zLmNvbmZpcm1CdXR0b25UZXh0ID0gcGFyYW1zLnNob3dDYW5jZWxCdXR0b24gPyAnQ29uZmlybScgOiBkZWZhdWx0UGFyYW1zLmNvbmZpcm1CdXR0b25UZXh0O1xuICAgICAgcGFyYW1zLmNvbmZpcm1CdXR0b25UZXh0ID0gYXJndW1lbnRPckRlZmF1bHQoJ2NvbmZpcm1CdXR0b25UZXh0Jyk7XG5cbiAgICAgIC8vIENhbGxiYWNrIGZ1bmN0aW9uIHdoZW4gY2xpY2tpbmcgb24gXCJPS1wiL1wiQ2FuY2VsXCJcbiAgICAgIHBhcmFtcy5kb25lRnVuY3Rpb24gPSBhcmd1bWVudHNbMV0gfHwgbnVsbDtcblxuICAgICAgYnJlYWs7XG5cbiAgICBkZWZhdWx0OlxuICAgICAgbG9nU3RyKCdVbmV4cGVjdGVkIHR5cGUgb2YgYXJndW1lbnQhIEV4cGVjdGVkIFwic3RyaW5nXCIgb3IgXCJvYmplY3RcIiwgZ290ICcgKyB0eXBlb2YgY3VzdG9taXphdGlvbnMpO1xuICAgICAgcmV0dXJuIGZhbHNlO1xuXG4gIH1cblxuICBzZXRQYXJhbWV0ZXJzKHBhcmFtcyk7XG4gIGZpeFZlcnRpY2FsUG9zaXRpb24oKTtcbiAgb3Blbk1vZGFsKGFyZ3VtZW50c1sxXSk7XG5cbiAgLy8gTW9kYWwgaW50ZXJhY3Rpb25zXG4gIHZhciBtb2RhbCA9IGdldE1vZGFsKCk7XG5cblxuICAvKlxuICAgKiBNYWtlIHN1cmUgYWxsIG1vZGFsIGJ1dHRvbnMgcmVzcG9uZCB0byBhbGwgZXZlbnRzXG4gICAqL1xuICB2YXIgJGJ1dHRvbnMgPSBtb2RhbC5xdWVyeVNlbGVjdG9yQWxsKCdidXR0b24nKTtcbiAgdmFyIGJ1dHRvbkV2ZW50cyA9IFsnb25jbGljaycsICdvbm1vdXNlb3ZlcicsICdvbm1vdXNlb3V0JywgJ29ubW91c2Vkb3duJywgJ29ubW91c2V1cCcsICdvbmZvY3VzJ107XG4gIHZhciBvbkJ1dHRvbkV2ZW50ID0gKGUpID0+IGhhbmRsZUJ1dHRvbihlLCBwYXJhbXMsIG1vZGFsKTtcblxuICBmb3IgKGxldCBidG5JbmRleCA9IDA7IGJ0bkluZGV4IDwgJGJ1dHRvbnMubGVuZ3RoOyBidG5JbmRleCsrKSB7XG4gICAgZm9yIChsZXQgZXZ0SW5kZXggPSAwOyBldnRJbmRleCA8IGJ1dHRvbkV2ZW50cy5sZW5ndGg7IGV2dEluZGV4KyspIHtcbiAgICAgIGxldCBidG5FdnQgPSBidXR0b25FdmVudHNbZXZ0SW5kZXhdO1xuICAgICAgJGJ1dHRvbnNbYnRuSW5kZXhdW2J0bkV2dF0gPSBvbkJ1dHRvbkV2ZW50O1xuICAgIH1cbiAgfVxuXG4gIC8vIENsaWNraW5nIG91dHNpZGUgdGhlIG1vZGFsIGRpc21pc3NlcyBpdCAoaWYgYWxsb3dlZCBieSB1c2VyKVxuICBnZXRPdmVybGF5KCkub25jbGljayA9IG9uQnV0dG9uRXZlbnQ7XG5cbiAgcHJldmlvdXNXaW5kb3dLZXlEb3duID0gd2luZG93Lm9ua2V5ZG93bjtcblxuICB2YXIgb25LZXlFdmVudCA9IChlKSA9PiBoYW5kbGVLZXlEb3duKGUsIHBhcmFtcywgbW9kYWwpO1xuICB3aW5kb3cub25rZXlkb3duID0gb25LZXlFdmVudDtcblxuICB3aW5kb3cub25mb2N1cyA9IGZ1bmN0aW9uICgpIHtcbiAgICAvLyBXaGVuIHRoZSB1c2VyIGhhcyBmb2N1c2VkIGF3YXkgYW5kIGZvY3VzZWQgYmFjayBmcm9tIHRoZSB3aG9sZSB3aW5kb3cuXG4gICAgc2V0VGltZW91dChmdW5jdGlvbiAoKSB7XG4gICAgICAvLyBQdXQgaW4gYSB0aW1lb3V0IHRvIGp1bXAgb3V0IG9mIHRoZSBldmVudCBzZXF1ZW5jZS5cbiAgICAgIC8vIENhbGxpbmcgZm9jdXMoKSBpbiB0aGUgZXZlbnQgc2VxdWVuY2UgY29uZnVzZXMgdGhpbmdzLlxuICAgICAgaWYgKGxhc3RGb2N1c2VkQnV0dG9uICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgbGFzdEZvY3VzZWRCdXR0b24uZm9jdXMoKTtcbiAgICAgICAgbGFzdEZvY3VzZWRCdXR0b24gPSB1bmRlZmluZWQ7XG4gICAgICB9XG4gICAgfSwgMCk7XG4gIH07XG4gIFxuICAvLyBTaG93IGFsZXJ0IHdpdGggZW5hYmxlZCBidXR0b25zIGFsd2F5c1xuICBzd2FsLmVuYWJsZUJ1dHRvbnMoKTtcbn07XG5cblxuXG4vKlxuICogU2V0IGRlZmF1bHQgcGFyYW1zIGZvciBlYWNoIHBvcHVwXG4gKiBAcGFyYW0ge09iamVjdH0gdXNlclBhcmFtc1xuICovXG5zd2VldEFsZXJ0LnNldERlZmF1bHRzID0gc3dhbC5zZXREZWZhdWx0cyA9IGZ1bmN0aW9uKHVzZXJQYXJhbXMpIHtcbiAgaWYgKCF1c2VyUGFyYW1zKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCd1c2VyUGFyYW1zIGlzIHJlcXVpcmVkJyk7XG4gIH1cbiAgaWYgKHR5cGVvZiB1c2VyUGFyYW1zICE9PSAnb2JqZWN0Jykge1xuICAgIHRocm93IG5ldyBFcnJvcigndXNlclBhcmFtcyBoYXMgdG8gYmUgYSBvYmplY3QnKTtcbiAgfVxuXG4gIGV4dGVuZChkZWZhdWx0UGFyYW1zLCB1c2VyUGFyYW1zKTtcbn07XG5cblxuLypcbiAqIEFuaW1hdGlvbiB3aGVuIGNsb3NpbmcgbW9kYWxcbiAqL1xuc3dlZXRBbGVydC5jbG9zZSA9IHN3YWwuY2xvc2UgPSBmdW5jdGlvbigpIHtcbiAgdmFyIG1vZGFsID0gZ2V0TW9kYWwoKTtcblxuICBmYWRlT3V0KGdldE92ZXJsYXkoKSwgNSk7XG4gIGZhZGVPdXQobW9kYWwsIDUpO1xuICByZW1vdmVDbGFzcyhtb2RhbCwgJ3Nob3dTd2VldEFsZXJ0Jyk7XG4gIGFkZENsYXNzKG1vZGFsLCAnaGlkZVN3ZWV0QWxlcnQnKTtcbiAgcmVtb3ZlQ2xhc3MobW9kYWwsICd2aXNpYmxlJyk7XG5cbiAgLypcbiAgICogUmVzZXQgaWNvbiBhbmltYXRpb25zXG4gICAqL1xuICB2YXIgJHN1Y2Nlc3NJY29uID0gbW9kYWwucXVlcnlTZWxlY3RvcignLnNhLWljb24uc2Etc3VjY2VzcycpO1xuICByZW1vdmVDbGFzcygkc3VjY2Vzc0ljb24sICdhbmltYXRlJyk7XG4gIHJlbW92ZUNsYXNzKCRzdWNjZXNzSWNvbi5xdWVyeVNlbGVjdG9yKCcuc2EtdGlwJyksICdhbmltYXRlU3VjY2Vzc1RpcCcpO1xuICByZW1vdmVDbGFzcygkc3VjY2Vzc0ljb24ucXVlcnlTZWxlY3RvcignLnNhLWxvbmcnKSwgJ2FuaW1hdGVTdWNjZXNzTG9uZycpO1xuXG4gIHZhciAkZXJyb3JJY29uID0gbW9kYWwucXVlcnlTZWxlY3RvcignLnNhLWljb24uc2EtZXJyb3InKTtcbiAgcmVtb3ZlQ2xhc3MoJGVycm9ySWNvbiwgJ2FuaW1hdGVFcnJvckljb24nKTtcbiAgcmVtb3ZlQ2xhc3MoJGVycm9ySWNvbi5xdWVyeVNlbGVjdG9yKCcuc2EteC1tYXJrJyksICdhbmltYXRlWE1hcmsnKTtcblxuICB2YXIgJHdhcm5pbmdJY29uID0gbW9kYWwucXVlcnlTZWxlY3RvcignLnNhLWljb24uc2Etd2FybmluZycpO1xuICByZW1vdmVDbGFzcygkd2FybmluZ0ljb24sICdwdWxzZVdhcm5pbmcnKTtcbiAgcmVtb3ZlQ2xhc3MoJHdhcm5pbmdJY29uLnF1ZXJ5U2VsZWN0b3IoJy5zYS1ib2R5JyksICdwdWxzZVdhcm5pbmdJbnMnKTtcbiAgcmVtb3ZlQ2xhc3MoJHdhcm5pbmdJY29uLnF1ZXJ5U2VsZWN0b3IoJy5zYS1kb3QnKSwgJ3B1bHNlV2FybmluZ0lucycpO1xuXG4gIC8vIFJlc2V0IGN1c3RvbSBjbGFzcyAoZGVsYXkgc28gdGhhdCBVSSBjaGFuZ2VzIGFyZW4ndCB2aXNpYmxlKVxuICBzZXRUaW1lb3V0KGZ1bmN0aW9uKCkge1xuICAgIHZhciBjdXN0b21DbGFzcyA9IG1vZGFsLmdldEF0dHJpYnV0ZSgnZGF0YS1jdXN0b20tY2xhc3MnKTtcbiAgICByZW1vdmVDbGFzcyhtb2RhbCwgY3VzdG9tQ2xhc3MpO1xuICB9LCAzMDApO1xuXG4gIC8vIE1ha2UgcGFnZSBzY3JvbGxhYmxlIGFnYWluXG4gIHJlbW92ZUNsYXNzKGRvY3VtZW50LmJvZHksICdzdG9wLXNjcm9sbGluZycpO1xuXG4gIC8vIFJlc2V0IHRoZSBwYWdlIHRvIGl0cyBwcmV2aW91cyBzdGF0ZVxuICB3aW5kb3cub25rZXlkb3duID0gcHJldmlvdXNXaW5kb3dLZXlEb3duO1xuICBpZiAod2luZG93LnByZXZpb3VzQWN0aXZlRWxlbWVudCkge1xuICAgIHdpbmRvdy5wcmV2aW91c0FjdGl2ZUVsZW1lbnQuZm9jdXMoKTtcbiAgfVxuICBsYXN0Rm9jdXNlZEJ1dHRvbiA9IHVuZGVmaW5lZDtcbiAgY2xlYXJUaW1lb3V0KG1vZGFsLnRpbWVvdXQpO1xuXG4gIHJldHVybiB0cnVlO1xufTtcblxuXG4vKlxuICogVmFsaWRhdGlvbiBvZiB0aGUgaW5wdXQgZmllbGQgaXMgZG9uZSBieSB1c2VyXG4gKiBJZiBzb21ldGhpbmcgaXMgd3JvbmcgPT4gY2FsbCBzaG93SW5wdXRFcnJvciB3aXRoIGVycm9yTWVzc2FnZVxuICovXG5zd2VldEFsZXJ0LnNob3dJbnB1dEVycm9yID0gc3dhbC5zaG93SW5wdXRFcnJvciA9IGZ1bmN0aW9uKGVycm9yTWVzc2FnZSkge1xuICB2YXIgbW9kYWwgPSBnZXRNb2RhbCgpO1xuXG4gIHZhciAkZXJyb3JJY29uID0gbW9kYWwucXVlcnlTZWxlY3RvcignLnNhLWlucHV0LWVycm9yJyk7XG4gIGFkZENsYXNzKCRlcnJvckljb24sICdzaG93Jyk7XG5cbiAgdmFyICRlcnJvckNvbnRhaW5lciA9IG1vZGFsLnF1ZXJ5U2VsZWN0b3IoJy5zYS1lcnJvci1jb250YWluZXInKTtcbiAgYWRkQ2xhc3MoJGVycm9yQ29udGFpbmVyLCAnc2hvdycpO1xuXG4gICRlcnJvckNvbnRhaW5lci5xdWVyeVNlbGVjdG9yKCdwJykuaW5uZXJIVE1MID0gZXJyb3JNZXNzYWdlO1xuXG4gIHNldFRpbWVvdXQoZnVuY3Rpb24oKSB7XG4gICAgc3dlZXRBbGVydC5lbmFibGVCdXR0b25zKCk7XG4gIH0sIDEpO1xuXG4gIG1vZGFsLnF1ZXJ5U2VsZWN0b3IoJ2lucHV0JykuZm9jdXMoKTtcbn07XG5cblxuLypcbiAqIFJlc2V0IGlucHV0IGVycm9yIERPTSBlbGVtZW50c1xuICovXG5zd2VldEFsZXJ0LnJlc2V0SW5wdXRFcnJvciA9IHN3YWwucmVzZXRJbnB1dEVycm9yID0gZnVuY3Rpb24oZXZlbnQpIHtcbiAgLy8gSWYgcHJlc3MgZW50ZXIgPT4gaWdub3JlXG4gIGlmIChldmVudCAmJiBldmVudC5rZXlDb2RlID09PSAxMykge1xuICAgIHJldHVybiBmYWxzZTtcbiAgfVxuXG4gIHZhciAkbW9kYWwgPSBnZXRNb2RhbCgpO1xuXG4gIHZhciAkZXJyb3JJY29uID0gJG1vZGFsLnF1ZXJ5U2VsZWN0b3IoJy5zYS1pbnB1dC1lcnJvcicpO1xuICByZW1vdmVDbGFzcygkZXJyb3JJY29uLCAnc2hvdycpO1xuXG4gIHZhciAkZXJyb3JDb250YWluZXIgPSAkbW9kYWwucXVlcnlTZWxlY3RvcignLnNhLWVycm9yLWNvbnRhaW5lcicpO1xuICByZW1vdmVDbGFzcygkZXJyb3JDb250YWluZXIsICdzaG93Jyk7XG59O1xuXG4vKlxuICogRGlzYWJsZSBjb25maXJtIGFuZCBjYW5jZWwgYnV0dG9uc1xuICovXG5zd2VldEFsZXJ0LmRpc2FibGVCdXR0b25zID0gc3dhbC5kaXNhYmxlQnV0dG9ucyA9IGZ1bmN0aW9uKGV2ZW50KSB7XG4gIHZhciBtb2RhbCA9IGdldE1vZGFsKCk7XG4gIHZhciAkY29uZmlybUJ1dHRvbiA9IG1vZGFsLnF1ZXJ5U2VsZWN0b3IoJ2J1dHRvbi5jb25maXJtJyk7XG4gIHZhciAkY2FuY2VsQnV0dG9uID0gbW9kYWwucXVlcnlTZWxlY3RvcignYnV0dG9uLmNhbmNlbCcpO1xuICAkY29uZmlybUJ1dHRvbi5kaXNhYmxlZCA9IHRydWU7XG4gICRjYW5jZWxCdXR0b24uZGlzYWJsZWQgPSB0cnVlO1xufTtcblxuLypcbiAqIEVuYWJsZSBjb25maXJtIGFuZCBjYW5jZWwgYnV0dG9uc1xuICovXG5zd2VldEFsZXJ0LmVuYWJsZUJ1dHRvbnMgPSBzd2FsLmVuYWJsZUJ1dHRvbnMgPSBmdW5jdGlvbihldmVudCkge1xuICB2YXIgbW9kYWwgPSBnZXRNb2RhbCgpO1xuICB2YXIgJGNvbmZpcm1CdXR0b24gPSBtb2RhbC5xdWVyeVNlbGVjdG9yKCdidXR0b24uY29uZmlybScpO1xuICB2YXIgJGNhbmNlbEJ1dHRvbiA9IG1vZGFsLnF1ZXJ5U2VsZWN0b3IoJ2J1dHRvbi5jYW5jZWwnKTtcbiAgJGNvbmZpcm1CdXR0b24uZGlzYWJsZWQgPSBmYWxzZTtcbiAgJGNhbmNlbEJ1dHRvbi5kaXNhYmxlZCA9IGZhbHNlO1xufTtcblxuaWYgKHR5cGVvZiB3aW5kb3cgIT09ICd1bmRlZmluZWQnKSB7XG4gIC8vIFRoZSAnaGFuZGxlLWNsaWNrJyBtb2R1bGUgcmVxdWlyZXNcbiAgLy8gdGhhdCAnc3dlZXRBbGVydCcgd2FzIHNldCBhcyBnbG9iYWwuXG4gIHdpbmRvdy5zd2VldEFsZXJ0ID0gd2luZG93LnN3YWwgPSBzd2VldEFsZXJ0O1xufSBlbHNlIHtcbiAgbG9nU3RyKCdTd2VldEFsZXJ0IGlzIGEgZnJvbnRlbmQgbW9kdWxlIScpO1xufVxuIiwidmFyIGRlZmF1bHRQYXJhbXMgPSB7XG4gIHRpdGxlOiAnJyxcbiAgdGV4dDogJycsXG4gIHR5cGU6IG51bGwsXG4gIGFsbG93T3V0c2lkZUNsaWNrOiBmYWxzZSxcbiAgc2hvd0NvbmZpcm1CdXR0b246IHRydWUsXG4gIHNob3dDYW5jZWxCdXR0b246IGZhbHNlLFxuICBjbG9zZU9uQ29uZmlybTogdHJ1ZSxcbiAgY2xvc2VPbkNhbmNlbDogdHJ1ZSxcbiAgY29uZmlybUJ1dHRvblRleHQ6ICdPSycsXG4gIGNvbmZpcm1CdXR0b25Db2xvcjogJyM4Q0Q0RjUnLFxuICBjYW5jZWxCdXR0b25UZXh0OiAnQ2FuY2VsJyxcbiAgaW1hZ2VVcmw6IG51bGwsXG4gIGltYWdlU2l6ZTogbnVsbCxcbiAgdGltZXI6IG51bGwsXG4gIGN1c3RvbUNsYXNzOiAnJyxcbiAgaHRtbDogZmFsc2UsXG4gIGFuaW1hdGlvbjogdHJ1ZSxcbiAgYWxsb3dFc2NhcGVLZXk6IHRydWUsXG4gIGlucHV0VHlwZTogJ3RleHQnLFxuICBpbnB1dFBsYWNlaG9sZGVyOiAnJyxcbiAgaW5wdXRWYWx1ZTogJycsXG4gIHNob3dMb2FkZXJPbkNvbmZpcm06IGZhbHNlXG59O1xuXG5leHBvcnQgZGVmYXVsdCBkZWZhdWx0UGFyYW1zO1xuIiwiaW1wb3J0IHsgY29sb3JMdW1pbmFuY2UgfSBmcm9tICcuL3V0aWxzJztcbmltcG9ydCB7IGdldE1vZGFsIH0gZnJvbSAnLi9oYW5kbGUtc3dhbC1kb20nO1xuaW1wb3J0IHsgaGFzQ2xhc3MsIGlzRGVzY2VuZGFudCB9IGZyb20gJy4vaGFuZGxlLWRvbSc7XG5cblxuLypcbiAqIFVzZXIgY2xpY2tlZCBvbiBcIkNvbmZpcm1cIi9cIk9LXCIgb3IgXCJDYW5jZWxcIlxuICovXG52YXIgaGFuZGxlQnV0dG9uID0gZnVuY3Rpb24oZXZlbnQsIHBhcmFtcywgbW9kYWwpIHtcbiAgdmFyIGUgPSBldmVudCB8fCB3aW5kb3cuZXZlbnQ7XG4gIHZhciB0YXJnZXQgPSBlLnRhcmdldCB8fCBlLnNyY0VsZW1lbnQ7XG5cbiAgdmFyIHRhcmdldGVkQ29uZmlybSA9IHRhcmdldC5jbGFzc05hbWUuaW5kZXhPZignY29uZmlybScpICE9PSAtMTtcbiAgdmFyIHRhcmdldGVkT3ZlcmxheSA9IHRhcmdldC5jbGFzc05hbWUuaW5kZXhPZignc3dlZXQtb3ZlcmxheScpICE9PSAtMTtcbiAgdmFyIG1vZGFsSXNWaXNpYmxlICA9IGhhc0NsYXNzKG1vZGFsLCAndmlzaWJsZScpO1xuICB2YXIgZG9uZUZ1bmN0aW9uRXhpc3RzID0gKHBhcmFtcy5kb25lRnVuY3Rpb24gJiYgbW9kYWwuZ2V0QXR0cmlidXRlKCdkYXRhLWhhcy1kb25lLWZ1bmN0aW9uJykgPT09ICd0cnVlJyk7XG5cbiAgLy8gU2luY2UgdGhlIHVzZXIgY2FuIGNoYW5nZSB0aGUgYmFja2dyb3VuZC1jb2xvciBvZiB0aGUgY29uZmlybSBidXR0b24gcHJvZ3JhbW1hdGljYWxseSxcbiAgLy8gd2UgbXVzdCBjYWxjdWxhdGUgd2hhdCB0aGUgY29sb3Igc2hvdWxkIGJlIG9uIGhvdmVyL2FjdGl2ZVxuICB2YXIgbm9ybWFsQ29sb3IsIGhvdmVyQ29sb3IsIGFjdGl2ZUNvbG9yO1xuICBpZiAodGFyZ2V0ZWRDb25maXJtICYmIHBhcmFtcy5jb25maXJtQnV0dG9uQ29sb3IpIHtcbiAgICBub3JtYWxDb2xvciAgPSBwYXJhbXMuY29uZmlybUJ1dHRvbkNvbG9yO1xuICAgIGhvdmVyQ29sb3IgICA9IGNvbG9yTHVtaW5hbmNlKG5vcm1hbENvbG9yLCAtMC4wNCk7XG4gICAgYWN0aXZlQ29sb3IgID0gY29sb3JMdW1pbmFuY2Uobm9ybWFsQ29sb3IsIC0wLjE0KTtcbiAgfVxuXG4gIGZ1bmN0aW9uIHNob3VsZFNldENvbmZpcm1CdXR0b25Db2xvcihjb2xvcikge1xuICAgIGlmICh0YXJnZXRlZENvbmZpcm0gJiYgcGFyYW1zLmNvbmZpcm1CdXR0b25Db2xvcikge1xuICAgICAgdGFyZ2V0LnN0eWxlLmJhY2tncm91bmRDb2xvciA9IGNvbG9yO1xuICAgIH1cbiAgfVxuXG4gIHN3aXRjaCAoZS50eXBlKSB7XG4gICAgY2FzZSAnbW91c2VvdmVyJzpcbiAgICAgIHNob3VsZFNldENvbmZpcm1CdXR0b25Db2xvcihob3ZlckNvbG9yKTtcbiAgICAgIGJyZWFrO1xuXG4gICAgY2FzZSAnbW91c2VvdXQnOlxuICAgICAgc2hvdWxkU2V0Q29uZmlybUJ1dHRvbkNvbG9yKG5vcm1hbENvbG9yKTtcbiAgICAgIGJyZWFrO1xuXG4gICAgY2FzZSAnbW91c2Vkb3duJzpcbiAgICAgIHNob3VsZFNldENvbmZpcm1CdXR0b25Db2xvcihhY3RpdmVDb2xvcik7XG4gICAgICBicmVhaztcblxuICAgIGNhc2UgJ21vdXNldXAnOlxuICAgICAgc2hvdWxkU2V0Q29uZmlybUJ1dHRvbkNvbG9yKGhvdmVyQ29sb3IpO1xuICAgICAgYnJlYWs7XG5cbiAgICBjYXNlICdmb2N1cyc6XG4gICAgICBsZXQgJGNvbmZpcm1CdXR0b24gPSBtb2RhbC5xdWVyeVNlbGVjdG9yKCdidXR0b24uY29uZmlybScpO1xuICAgICAgbGV0ICRjYW5jZWxCdXR0b24gID0gbW9kYWwucXVlcnlTZWxlY3RvcignYnV0dG9uLmNhbmNlbCcpO1xuXG4gICAgICBpZiAodGFyZ2V0ZWRDb25maXJtKSB7XG4gICAgICAgICRjYW5jZWxCdXR0b24uc3R5bGUuYm94U2hhZG93ID0gJ25vbmUnO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgJGNvbmZpcm1CdXR0b24uc3R5bGUuYm94U2hhZG93ID0gJ25vbmUnO1xuICAgICAgfVxuICAgICAgYnJlYWs7XG5cbiAgICBjYXNlICdjbGljayc6XG4gICAgICBsZXQgY2xpY2tlZE9uTW9kYWwgPSAobW9kYWwgPT09IHRhcmdldCk7XG4gICAgICBsZXQgY2xpY2tlZE9uTW9kYWxDaGlsZCA9IGlzRGVzY2VuZGFudChtb2RhbCwgdGFyZ2V0KTtcblxuICAgICAgLy8gSWdub3JlIGNsaWNrIG91dHNpZGUgaWYgYWxsb3dPdXRzaWRlQ2xpY2sgaXMgZmFsc2VcbiAgICAgIGlmICghY2xpY2tlZE9uTW9kYWwgJiYgIWNsaWNrZWRPbk1vZGFsQ2hpbGQgJiYgbW9kYWxJc1Zpc2libGUgJiYgIXBhcmFtcy5hbGxvd091dHNpZGVDbGljaykge1xuICAgICAgICBicmVhaztcbiAgICAgIH1cblxuICAgICAgaWYgKHRhcmdldGVkQ29uZmlybSAmJiBkb25lRnVuY3Rpb25FeGlzdHMgJiYgbW9kYWxJc1Zpc2libGUpIHtcbiAgICAgICAgaGFuZGxlQ29uZmlybShtb2RhbCwgcGFyYW1zKTtcbiAgICAgIH0gZWxzZSBpZiAoZG9uZUZ1bmN0aW9uRXhpc3RzICYmIG1vZGFsSXNWaXNpYmxlIHx8IHRhcmdldGVkT3ZlcmxheSkge1xuICAgICAgICBoYW5kbGVDYW5jZWwobW9kYWwsIHBhcmFtcyk7XG4gICAgICB9IGVsc2UgaWYgKGlzRGVzY2VuZGFudChtb2RhbCwgdGFyZ2V0KSAmJiB0YXJnZXQudGFnTmFtZSA9PT0gJ0JVVFRPTicpIHtcbiAgICAgICAgc3dlZXRBbGVydC5jbG9zZSgpO1xuICAgICAgfVxuICAgICAgYnJlYWs7XG4gIH1cbn07XG5cbi8qXG4gKiAgVXNlciBjbGlja2VkIG9uIFwiQ29uZmlybVwiL1wiT0tcIlxuICovXG52YXIgaGFuZGxlQ29uZmlybSA9IGZ1bmN0aW9uKG1vZGFsLCBwYXJhbXMpIHtcbiAgdmFyIGNhbGxiYWNrVmFsdWUgPSB0cnVlO1xuXG4gIGlmIChoYXNDbGFzcyhtb2RhbCwgJ3Nob3ctaW5wdXQnKSkge1xuICAgIGNhbGxiYWNrVmFsdWUgPSBtb2RhbC5xdWVyeVNlbGVjdG9yKCdpbnB1dCcpLnZhbHVlO1xuXG4gICAgaWYgKCFjYWxsYmFja1ZhbHVlKSB7XG4gICAgICBjYWxsYmFja1ZhbHVlID0gJyc7XG4gICAgfVxuICB9XG5cbiAgcGFyYW1zLmRvbmVGdW5jdGlvbihjYWxsYmFja1ZhbHVlKTtcblxuICBpZiAocGFyYW1zLmNsb3NlT25Db25maXJtKSB7XG4gICAgc3dlZXRBbGVydC5jbG9zZSgpO1xuICB9XG4gIC8vIERpc2FibGUgY2FuY2VsIGFuZCBjb25maXJtIGJ1dHRvbiBpZiB0aGUgcGFyYW1ldGVyIGlzIHRydWVcbiAgaWYgKHBhcmFtcy5zaG93TG9hZGVyT25Db25maXJtKSB7XG4gICAgc3dlZXRBbGVydC5kaXNhYmxlQnV0dG9ucygpO1xuICB9XG59O1xuXG4vKlxuICogIFVzZXIgY2xpY2tlZCBvbiBcIkNhbmNlbFwiXG4gKi9cbnZhciBoYW5kbGVDYW5jZWwgPSBmdW5jdGlvbihtb2RhbCwgcGFyYW1zKSB7XG4gIC8vIENoZWNrIGlmIGNhbGxiYWNrIGZ1bmN0aW9uIGV4cGVjdHMgYSBwYXJhbWV0ZXIgKHRvIHRyYWNrIGNhbmNlbCBhY3Rpb25zKVxuICB2YXIgZnVuY3Rpb25Bc1N0ciA9IFN0cmluZyhwYXJhbXMuZG9uZUZ1bmN0aW9uKS5yZXBsYWNlKC9cXHMvZywgJycpO1xuICB2YXIgZnVuY3Rpb25IYW5kbGVzQ2FuY2VsID0gZnVuY3Rpb25Bc1N0ci5zdWJzdHJpbmcoMCwgOSkgPT09ICdmdW5jdGlvbignICYmIGZ1bmN0aW9uQXNTdHIuc3Vic3RyaW5nKDksIDEwKSAhPT0gJyknO1xuXG4gIGlmIChmdW5jdGlvbkhhbmRsZXNDYW5jZWwpIHtcbiAgICBwYXJhbXMuZG9uZUZ1bmN0aW9uKGZhbHNlKTtcbiAgfVxuXG4gIGlmIChwYXJhbXMuY2xvc2VPbkNhbmNlbCkge1xuICAgIHN3ZWV0QWxlcnQuY2xvc2UoKTtcbiAgfVxufTtcblxuXG5leHBvcnQgZGVmYXVsdCB7XG4gIGhhbmRsZUJ1dHRvbixcbiAgaGFuZGxlQ29uZmlybSxcbiAgaGFuZGxlQ2FuY2VsXG59O1xuIiwidmFyIGhhc0NsYXNzID0gZnVuY3Rpb24oZWxlbSwgY2xhc3NOYW1lKSB7XG4gIHJldHVybiBuZXcgUmVnRXhwKCcgJyArIGNsYXNzTmFtZSArICcgJykudGVzdCgnICcgKyBlbGVtLmNsYXNzTmFtZSArICcgJyk7XG59O1xuXG52YXIgYWRkQ2xhc3MgPSBmdW5jdGlvbihlbGVtLCBjbGFzc05hbWUpIHtcbiAgaWYgKCFoYXNDbGFzcyhlbGVtLCBjbGFzc05hbWUpKSB7XG4gICAgZWxlbS5jbGFzc05hbWUgKz0gJyAnICsgY2xhc3NOYW1lO1xuICB9XG59O1xuXG52YXIgcmVtb3ZlQ2xhc3MgPSBmdW5jdGlvbihlbGVtLCBjbGFzc05hbWUpIHtcbiAgdmFyIG5ld0NsYXNzID0gJyAnICsgZWxlbS5jbGFzc05hbWUucmVwbGFjZSgvW1xcdFxcclxcbl0vZywgJyAnKSArICcgJztcbiAgaWYgKGhhc0NsYXNzKGVsZW0sIGNsYXNzTmFtZSkpIHtcbiAgICB3aGlsZSAobmV3Q2xhc3MuaW5kZXhPZignICcgKyBjbGFzc05hbWUgKyAnICcpID49IDApIHtcbiAgICAgIG5ld0NsYXNzID0gbmV3Q2xhc3MucmVwbGFjZSgnICcgKyBjbGFzc05hbWUgKyAnICcsICcgJyk7XG4gICAgfVxuICAgIGVsZW0uY2xhc3NOYW1lID0gbmV3Q2xhc3MucmVwbGFjZSgvXlxccyt8XFxzKyQvZywgJycpO1xuICB9XG59O1xuXG52YXIgZXNjYXBlSHRtbCA9IGZ1bmN0aW9uKHN0cikge1xuICB2YXIgZGl2ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2Jyk7XG4gIGRpdi5hcHBlbmRDaGlsZChkb2N1bWVudC5jcmVhdGVUZXh0Tm9kZShzdHIpKTtcbiAgcmV0dXJuIGRpdi5pbm5lckhUTUw7XG59O1xuXG52YXIgX3Nob3cgPSBmdW5jdGlvbihlbGVtKSB7XG4gIGVsZW0uc3R5bGUub3BhY2l0eSA9ICcnO1xuICBlbGVtLnN0eWxlLmRpc3BsYXkgPSAnYmxvY2snO1xufTtcblxudmFyIHNob3cgPSBmdW5jdGlvbihlbGVtcykge1xuICBpZiAoZWxlbXMgJiYgIWVsZW1zLmxlbmd0aCkge1xuICAgIHJldHVybiBfc2hvdyhlbGVtcyk7XG4gIH1cbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBlbGVtcy5sZW5ndGg7ICsraSkge1xuICAgIF9zaG93KGVsZW1zW2ldKTtcbiAgfVxufTtcblxudmFyIF9oaWRlID0gZnVuY3Rpb24oZWxlbSkge1xuICBlbGVtLnN0eWxlLm9wYWNpdHkgPSAnJztcbiAgZWxlbS5zdHlsZS5kaXNwbGF5ID0gJ25vbmUnO1xufTtcblxudmFyIGhpZGUgPSBmdW5jdGlvbihlbGVtcykge1xuICBpZiAoZWxlbXMgJiYgIWVsZW1zLmxlbmd0aCkge1xuICAgIHJldHVybiBfaGlkZShlbGVtcyk7XG4gIH1cbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBlbGVtcy5sZW5ndGg7ICsraSkge1xuICAgIF9oaWRlKGVsZW1zW2ldKTtcbiAgfVxufTtcblxudmFyIGlzRGVzY2VuZGFudCA9IGZ1bmN0aW9uKHBhcmVudCwgY2hpbGQpIHtcbiAgdmFyIG5vZGUgPSBjaGlsZC5wYXJlbnROb2RlO1xuICB3aGlsZSAobm9kZSAhPT0gbnVsbCkge1xuICAgIGlmIChub2RlID09PSBwYXJlbnQpIHtcbiAgICAgIHJldHVybiB0cnVlO1xuICAgIH1cbiAgICBub2RlID0gbm9kZS5wYXJlbnROb2RlO1xuICB9XG4gIHJldHVybiBmYWxzZTtcbn07XG5cbnZhciBnZXRUb3BNYXJnaW4gPSBmdW5jdGlvbihlbGVtKSB7XG4gIGVsZW0uc3R5bGUubGVmdCA9ICctOTk5OXB4JztcbiAgZWxlbS5zdHlsZS5kaXNwbGF5ID0gJ2Jsb2NrJztcblxuICB2YXIgaGVpZ2h0ID0gZWxlbS5jbGllbnRIZWlnaHQsXG4gICAgICBwYWRkaW5nO1xuICBpZiAodHlwZW9mIGdldENvbXB1dGVkU3R5bGUgIT09IFwidW5kZWZpbmVkXCIpIHsgLy8gSUUgOFxuICAgIHBhZGRpbmcgPSBwYXJzZUludChnZXRDb21wdXRlZFN0eWxlKGVsZW0pLmdldFByb3BlcnR5VmFsdWUoJ3BhZGRpbmctdG9wJyksIDEwKTtcbiAgfSBlbHNlIHtcbiAgICBwYWRkaW5nID0gcGFyc2VJbnQoZWxlbS5jdXJyZW50U3R5bGUucGFkZGluZyk7XG4gIH1cblxuICBlbGVtLnN0eWxlLmxlZnQgPSAnJztcbiAgZWxlbS5zdHlsZS5kaXNwbGF5ID0gJ25vbmUnO1xuICByZXR1cm4gKCctJyArIHBhcnNlSW50KChoZWlnaHQgKyBwYWRkaW5nKSAvIDIpICsgJ3B4Jyk7XG59O1xuXG52YXIgZmFkZUluID0gZnVuY3Rpb24oZWxlbSwgaW50ZXJ2YWwpIHtcbiAgaWYgKCtlbGVtLnN0eWxlLm9wYWNpdHkgPCAxKSB7XG4gICAgaW50ZXJ2YWwgPSBpbnRlcnZhbCB8fCAxNjtcbiAgICBlbGVtLnN0eWxlLm9wYWNpdHkgPSAwO1xuICAgIGVsZW0uc3R5bGUuZGlzcGxheSA9ICdibG9jayc7XG4gICAgdmFyIGxhc3QgPSArbmV3IERhdGUoKTtcbiAgICB2YXIgdGljayA9IGZ1bmN0aW9uKCkge1xuICAgICAgZWxlbS5zdHlsZS5vcGFjaXR5ID0gK2VsZW0uc3R5bGUub3BhY2l0eSArIChuZXcgRGF0ZSgpIC0gbGFzdCkgLyAxMDA7XG4gICAgICBsYXN0ID0gK25ldyBEYXRlKCk7XG5cbiAgICAgIGlmICgrZWxlbS5zdHlsZS5vcGFjaXR5IDwgMSkge1xuICAgICAgICBzZXRUaW1lb3V0KHRpY2ssIGludGVydmFsKTtcbiAgICAgIH1cbiAgICB9O1xuICAgIHRpY2soKTtcbiAgfVxuICBlbGVtLnN0eWxlLmRpc3BsYXkgPSAnYmxvY2snOyAvL2ZhbGxiYWNrIElFOFxufTtcblxudmFyIGZhZGVPdXQgPSBmdW5jdGlvbihlbGVtLCBpbnRlcnZhbCkge1xuICBpbnRlcnZhbCA9IGludGVydmFsIHx8IDE2O1xuICBlbGVtLnN0eWxlLm9wYWNpdHkgPSAxO1xuICB2YXIgbGFzdCA9ICtuZXcgRGF0ZSgpO1xuICB2YXIgdGljayA9IGZ1bmN0aW9uKCkge1xuICAgIGVsZW0uc3R5bGUub3BhY2l0eSA9ICtlbGVtLnN0eWxlLm9wYWNpdHkgLSAobmV3IERhdGUoKSAtIGxhc3QpIC8gMTAwO1xuICAgIGxhc3QgPSArbmV3IERhdGUoKTtcblxuICAgIGlmICgrZWxlbS5zdHlsZS5vcGFjaXR5ID4gMCkge1xuICAgICAgc2V0VGltZW91dCh0aWNrLCBpbnRlcnZhbCk7XG4gICAgfSBlbHNlIHtcbiAgICAgIGVsZW0uc3R5bGUuZGlzcGxheSA9ICdub25lJztcbiAgICB9XG4gIH07XG4gIHRpY2soKTtcbn07XG5cbnZhciBmaXJlQ2xpY2sgPSBmdW5jdGlvbihub2RlKSB7XG4gIC8vIFRha2VuIGZyb20gaHR0cDovL3d3dy5ub25vYnRydXNpdmUuY29tLzIwMTEvMTEvMjkvcHJvZ3JhbWF0aWNhbGx5LWZpcmUtY3Jvc3Nicm93c2VyLWNsaWNrLWV2ZW50LXdpdGgtamF2YXNjcmlwdC9cbiAgLy8gVGhlbiBmaXhlZCBmb3IgdG9kYXkncyBDaHJvbWUgYnJvd3Nlci5cbiAgaWYgKHR5cGVvZiBNb3VzZUV2ZW50ID09PSAnZnVuY3Rpb24nKSB7XG4gICAgLy8gVXAtdG8tZGF0ZSBhcHByb2FjaFxuICAgIHZhciBtZXZ0ID0gbmV3IE1vdXNlRXZlbnQoJ2NsaWNrJywge1xuICAgICAgdmlldzogd2luZG93LFxuICAgICAgYnViYmxlczogZmFsc2UsXG4gICAgICBjYW5jZWxhYmxlOiB0cnVlXG4gICAgfSk7XG4gICAgbm9kZS5kaXNwYXRjaEV2ZW50KG1ldnQpO1xuICB9IGVsc2UgaWYgKCBkb2N1bWVudC5jcmVhdGVFdmVudCApIHtcbiAgICAvLyBGYWxsYmFja1xuICAgIHZhciBldnQgPSBkb2N1bWVudC5jcmVhdGVFdmVudCgnTW91c2VFdmVudHMnKTtcbiAgICBldnQuaW5pdEV2ZW50KCdjbGljaycsIGZhbHNlLCBmYWxzZSk7XG4gICAgbm9kZS5kaXNwYXRjaEV2ZW50KGV2dCk7XG4gIH0gZWxzZSBpZiAoZG9jdW1lbnQuY3JlYXRlRXZlbnRPYmplY3QpIHtcbiAgICBub2RlLmZpcmVFdmVudCgnb25jbGljaycpIDtcbiAgfSBlbHNlIGlmICh0eXBlb2Ygbm9kZS5vbmNsaWNrID09PSAnZnVuY3Rpb24nICkge1xuICAgIG5vZGUub25jbGljaygpO1xuICB9XG59O1xuXG52YXIgc3RvcEV2ZW50UHJvcGFnYXRpb24gPSBmdW5jdGlvbihlKSB7XG4gIC8vIEluIHBhcnRpY3VsYXIsIG1ha2Ugc3VyZSB0aGUgc3BhY2UgYmFyIGRvZXNuJ3Qgc2Nyb2xsIHRoZSBtYWluIHdpbmRvdy5cbiAgaWYgKHR5cGVvZiBlLnN0b3BQcm9wYWdhdGlvbiA9PT0gJ2Z1bmN0aW9uJykge1xuICAgIGUuc3RvcFByb3BhZ2F0aW9uKCk7XG4gICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICB9IGVsc2UgaWYgKHdpbmRvdy5ldmVudCAmJiB3aW5kb3cuZXZlbnQuaGFzT3duUHJvcGVydHkoJ2NhbmNlbEJ1YmJsZScpKSB7XG4gICAgd2luZG93LmV2ZW50LmNhbmNlbEJ1YmJsZSA9IHRydWU7XG4gIH1cbn07XG5cbmV4cG9ydCB7IFxuICBoYXNDbGFzcywgYWRkQ2xhc3MsIHJlbW92ZUNsYXNzLCBcbiAgZXNjYXBlSHRtbCwgXG4gIF9zaG93LCBzaG93LCBfaGlkZSwgaGlkZSwgXG4gIGlzRGVzY2VuZGFudCwgXG4gIGdldFRvcE1hcmdpbixcbiAgZmFkZUluLCBmYWRlT3V0LFxuICBmaXJlQ2xpY2ssXG4gIHN0b3BFdmVudFByb3BhZ2F0aW9uXG59O1xuIiwiaW1wb3J0IHsgc3RvcEV2ZW50UHJvcGFnYXRpb24sIGZpcmVDbGljayB9IGZyb20gJy4vaGFuZGxlLWRvbSc7XG5pbXBvcnQgeyBzZXRGb2N1c1N0eWxlIH0gZnJvbSAnLi9oYW5kbGUtc3dhbC1kb20nO1xuXG5cbnZhciBoYW5kbGVLZXlEb3duID0gZnVuY3Rpb24oZXZlbnQsIHBhcmFtcywgbW9kYWwpIHtcbiAgdmFyIGUgPSBldmVudCB8fCB3aW5kb3cuZXZlbnQ7XG4gIHZhciBrZXlDb2RlID0gZS5rZXlDb2RlIHx8IGUud2hpY2g7XG5cbiAgdmFyICRva0J1dHRvbiAgICAgPSBtb2RhbC5xdWVyeVNlbGVjdG9yKCdidXR0b24uY29uZmlybScpO1xuICB2YXIgJGNhbmNlbEJ1dHRvbiA9IG1vZGFsLnF1ZXJ5U2VsZWN0b3IoJ2J1dHRvbi5jYW5jZWwnKTtcbiAgdmFyICRtb2RhbEJ1dHRvbnMgPSBtb2RhbC5xdWVyeVNlbGVjdG9yQWxsKCdidXR0b25bdGFiaW5kZXhdJyk7XG5cblxuICBpZiAoWzksIDEzLCAzMiwgMjddLmluZGV4T2Yoa2V5Q29kZSkgPT09IC0xKSB7XG4gICAgLy8gRG9uJ3QgZG8gd29yayBvbiBrZXlzIHdlIGRvbid0IGNhcmUgYWJvdXQuXG4gICAgcmV0dXJuO1xuICB9XG5cbiAgdmFyICR0YXJnZXRFbGVtZW50ID0gZS50YXJnZXQgfHwgZS5zcmNFbGVtZW50O1xuXG4gIHZhciBidG5JbmRleCA9IC0xOyAvLyBGaW5kIHRoZSBidXR0b24gLSBub3RlLCB0aGlzIGlzIGEgbm9kZWxpc3QsIG5vdCBhbiBhcnJheS5cbiAgZm9yICh2YXIgaSA9IDA7IGkgPCAkbW9kYWxCdXR0b25zLmxlbmd0aDsgaSsrKSB7XG4gICAgaWYgKCR0YXJnZXRFbGVtZW50ID09PSAkbW9kYWxCdXR0b25zW2ldKSB7XG4gICAgICBidG5JbmRleCA9IGk7XG4gICAgICBicmVhaztcbiAgICB9XG4gIH1cblxuICBpZiAoa2V5Q29kZSA9PT0gOSkge1xuICAgIC8vIFRBQlxuICAgIGlmIChidG5JbmRleCA9PT0gLTEpIHtcbiAgICAgIC8vIE5vIGJ1dHRvbiBmb2N1c2VkLiBKdW1wIHRvIHRoZSBjb25maXJtIGJ1dHRvbi5cbiAgICAgICR0YXJnZXRFbGVtZW50ID0gJG9rQnV0dG9uO1xuICAgIH0gZWxzZSB7XG4gICAgICAvLyBDeWNsZSB0byB0aGUgbmV4dCBidXR0b25cbiAgICAgIGlmIChidG5JbmRleCA9PT0gJG1vZGFsQnV0dG9ucy5sZW5ndGggLSAxKSB7XG4gICAgICAgICR0YXJnZXRFbGVtZW50ID0gJG1vZGFsQnV0dG9uc1swXTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgICR0YXJnZXRFbGVtZW50ID0gJG1vZGFsQnV0dG9uc1tidG5JbmRleCArIDFdO1xuICAgICAgfVxuICAgIH1cblxuICAgIHN0b3BFdmVudFByb3BhZ2F0aW9uKGUpO1xuICAgICR0YXJnZXRFbGVtZW50LmZvY3VzKCk7XG5cbiAgICBpZiAocGFyYW1zLmNvbmZpcm1CdXR0b25Db2xvcikge1xuICAgICAgc2V0Rm9jdXNTdHlsZSgkdGFyZ2V0RWxlbWVudCwgcGFyYW1zLmNvbmZpcm1CdXR0b25Db2xvcik7XG4gICAgfVxuICB9IGVsc2Uge1xuICAgIGlmIChrZXlDb2RlID09PSAxMykge1xuICAgICAgaWYgKCR0YXJnZXRFbGVtZW50LnRhZ05hbWUgPT09ICdJTlBVVCcpIHtcbiAgICAgICAgJHRhcmdldEVsZW1lbnQgPSAkb2tCdXR0b247XG4gICAgICAgICRva0J1dHRvbi5mb2N1cygpO1xuICAgICAgfVxuXG4gICAgICBpZiAoYnRuSW5kZXggPT09IC0xKSB7XG4gICAgICAgIC8vIEVOVEVSL1NQQUNFIGNsaWNrZWQgb3V0c2lkZSBvZiBhIGJ1dHRvbi5cbiAgICAgICAgJHRhcmdldEVsZW1lbnQgPSAkb2tCdXR0b247XG4gICAgICB9IGVsc2Uge1xuICAgICAgICAvLyBEbyBub3RoaW5nIC0gbGV0IHRoZSBicm93c2VyIGhhbmRsZSBpdC5cbiAgICAgICAgJHRhcmdldEVsZW1lbnQgPSB1bmRlZmluZWQ7XG4gICAgICB9XG4gICAgfSBlbHNlIGlmIChrZXlDb2RlID09PSAyNyAmJiBwYXJhbXMuYWxsb3dFc2NhcGVLZXkgPT09IHRydWUpIHtcbiAgICAgICR0YXJnZXRFbGVtZW50ID0gJGNhbmNlbEJ1dHRvbjtcbiAgICAgIGZpcmVDbGljaygkdGFyZ2V0RWxlbWVudCwgZSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIC8vIEZhbGxiYWNrIC0gbGV0IHRoZSBicm93c2VyIGhhbmRsZSBpdC5cbiAgICAgICR0YXJnZXRFbGVtZW50ID0gdW5kZWZpbmVkO1xuICAgIH1cbiAgfVxufTtcblxuZXhwb3J0IGRlZmF1bHQgaGFuZGxlS2V5RG93bjtcbiIsImltcG9ydCB7IGhleFRvUmdiIH0gZnJvbSAnLi91dGlscyc7XG5pbXBvcnQgeyByZW1vdmVDbGFzcywgZ2V0VG9wTWFyZ2luLCBmYWRlSW4sIHNob3csIGFkZENsYXNzIH0gZnJvbSAnLi9oYW5kbGUtZG9tJztcbmltcG9ydCBkZWZhdWx0UGFyYW1zIGZyb20gJy4vZGVmYXVsdC1wYXJhbXMnO1xuXG52YXIgbW9kYWxDbGFzcyAgID0gJy5zd2VldC1hbGVydCc7XG52YXIgb3ZlcmxheUNsYXNzID0gJy5zd2VldC1vdmVybGF5JztcblxuLypcbiAqIEFkZCBtb2RhbCArIG92ZXJsYXkgdG8gRE9NXG4gKi9cbmltcG9ydCBpbmplY3RlZEhUTUwgZnJvbSAnLi9pbmplY3RlZC1odG1sJztcblxudmFyIHN3ZWV0QWxlcnRJbml0aWFsaXplID0gZnVuY3Rpb24oKSB7XG4gIHZhciBzd2VldFdyYXAgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKTtcbiAgc3dlZXRXcmFwLmlubmVySFRNTCA9IGluamVjdGVkSFRNTDtcblxuICAvLyBBcHBlbmQgZWxlbWVudHMgdG8gYm9keVxuICB3aGlsZSAoc3dlZXRXcmFwLmZpcnN0Q2hpbGQpIHtcbiAgICBkb2N1bWVudC5ib2R5LmFwcGVuZENoaWxkKHN3ZWV0V3JhcC5maXJzdENoaWxkKTtcbiAgfVxufTtcblxuLypcbiAqIEdldCBET00gZWxlbWVudCBvZiBtb2RhbFxuICovXG52YXIgZ2V0TW9kYWwgPSBmdW5jdGlvbigpIHtcbiAgdmFyICRtb2RhbCA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IobW9kYWxDbGFzcyk7XG5cbiAgaWYgKCEkbW9kYWwpIHtcbiAgICBzd2VldEFsZXJ0SW5pdGlhbGl6ZSgpO1xuICAgICRtb2RhbCA9IGdldE1vZGFsKCk7XG4gIH1cblxuICByZXR1cm4gJG1vZGFsO1xufTtcblxuLypcbiAqIEdldCBET00gZWxlbWVudCBvZiBpbnB1dCAoaW4gbW9kYWwpXG4gKi9cbnZhciBnZXRJbnB1dCA9IGZ1bmN0aW9uKCkge1xuICB2YXIgJG1vZGFsID0gZ2V0TW9kYWwoKTtcbiAgaWYgKCRtb2RhbCkge1xuICAgIHJldHVybiAkbW9kYWwucXVlcnlTZWxlY3RvcignaW5wdXQnKTtcbiAgfVxufTtcblxuLypcbiAqIEdldCBET00gZWxlbWVudCBvZiBvdmVybGF5XG4gKi9cbnZhciBnZXRPdmVybGF5ID0gZnVuY3Rpb24oKSB7XG4gIHJldHVybiBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKG92ZXJsYXlDbGFzcyk7XG59O1xuXG4vKlxuICogQWRkIGJveC1zaGFkb3cgc3R5bGUgdG8gYnV0dG9uIChkZXBlbmRpbmcgb24gaXRzIGNob3NlbiBiZy1jb2xvcilcbiAqL1xudmFyIHNldEZvY3VzU3R5bGUgPSBmdW5jdGlvbigkYnV0dG9uLCBiZ0NvbG9yKSB7XG4gIHZhciByZ2JDb2xvciA9IGhleFRvUmdiKGJnQ29sb3IpO1xuICAkYnV0dG9uLnN0eWxlLmJveFNoYWRvdyA9ICcwIDAgMnB4IHJnYmEoJyArIHJnYkNvbG9yICsgJywgMC44KSwgaW5zZXQgMCAwIDAgMXB4IHJnYmEoMCwgMCwgMCwgMC4wNSknO1xufTtcblxuLypcbiAqIEFuaW1hdGlvbiB3aGVuIG9wZW5pbmcgbW9kYWxcbiAqL1xudmFyIG9wZW5Nb2RhbCA9IGZ1bmN0aW9uKGNhbGxiYWNrKSB7XG4gIHZhciAkbW9kYWwgPSBnZXRNb2RhbCgpO1xuICBmYWRlSW4oZ2V0T3ZlcmxheSgpLCAxMCk7XG4gIHNob3coJG1vZGFsKTtcbiAgYWRkQ2xhc3MoJG1vZGFsLCAnc2hvd1N3ZWV0QWxlcnQnKTtcbiAgcmVtb3ZlQ2xhc3MoJG1vZGFsLCAnaGlkZVN3ZWV0QWxlcnQnKTtcblxuICB3aW5kb3cucHJldmlvdXNBY3RpdmVFbGVtZW50ID0gZG9jdW1lbnQuYWN0aXZlRWxlbWVudDtcbiAgdmFyICRva0J1dHRvbiA9ICRtb2RhbC5xdWVyeVNlbGVjdG9yKCdidXR0b24uY29uZmlybScpO1xuICAkb2tCdXR0b24uZm9jdXMoKTtcblxuICBzZXRUaW1lb3V0KGZ1bmN0aW9uICgpIHtcbiAgICBhZGRDbGFzcygkbW9kYWwsICd2aXNpYmxlJyk7XG4gIH0sIDUwMCk7XG5cbiAgdmFyIHRpbWVyID0gJG1vZGFsLmdldEF0dHJpYnV0ZSgnZGF0YS10aW1lcicpO1xuXG4gIGlmICh0aW1lciAhPT0gJ251bGwnICYmIHRpbWVyICE9PSAnJykge1xuICAgIHZhciB0aW1lckNhbGxiYWNrID0gY2FsbGJhY2s7XG4gICAgJG1vZGFsLnRpbWVvdXQgPSBzZXRUaW1lb3V0KGZ1bmN0aW9uKCkge1xuICAgICAgdmFyIGRvbmVGdW5jdGlvbkV4aXN0cyA9ICgodGltZXJDYWxsYmFjayB8fCBudWxsKSAmJiAkbW9kYWwuZ2V0QXR0cmlidXRlKCdkYXRhLWhhcy1kb25lLWZ1bmN0aW9uJykgPT09ICd0cnVlJyk7XG4gICAgICBpZiAoZG9uZUZ1bmN0aW9uRXhpc3RzKSB7IFxuICAgICAgICB0aW1lckNhbGxiYWNrKG51bGwpO1xuICAgICAgfVxuICAgICAgZWxzZSB7XG4gICAgICAgIHN3ZWV0QWxlcnQuY2xvc2UoKTtcbiAgICAgIH1cbiAgICB9LCB0aW1lcik7XG4gIH1cbn07XG5cbi8qXG4gKiBSZXNldCB0aGUgc3R5bGluZyBvZiB0aGUgaW5wdXRcbiAqIChmb3IgZXhhbXBsZSBpZiBlcnJvcnMgaGF2ZSBiZWVuIHNob3duKVxuICovXG52YXIgcmVzZXRJbnB1dCA9IGZ1bmN0aW9uKCkge1xuICB2YXIgJG1vZGFsID0gZ2V0TW9kYWwoKTtcbiAgdmFyICRpbnB1dCA9IGdldElucHV0KCk7XG5cbiAgcmVtb3ZlQ2xhc3MoJG1vZGFsLCAnc2hvdy1pbnB1dCcpO1xuICAkaW5wdXQudmFsdWUgPSBkZWZhdWx0UGFyYW1zLmlucHV0VmFsdWU7XG4gICRpbnB1dC5zZXRBdHRyaWJ1dGUoJ3R5cGUnLCBkZWZhdWx0UGFyYW1zLmlucHV0VHlwZSk7XG4gICRpbnB1dC5zZXRBdHRyaWJ1dGUoJ3BsYWNlaG9sZGVyJywgZGVmYXVsdFBhcmFtcy5pbnB1dFBsYWNlaG9sZGVyKTtcblxuICByZXNldElucHV0RXJyb3IoKTtcbn07XG5cblxudmFyIHJlc2V0SW5wdXRFcnJvciA9IGZ1bmN0aW9uKGV2ZW50KSB7XG4gIC8vIElmIHByZXNzIGVudGVyID0+IGlnbm9yZVxuICBpZiAoZXZlbnQgJiYgZXZlbnQua2V5Q29kZSA9PT0gMTMpIHtcbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cblxuICB2YXIgJG1vZGFsID0gZ2V0TW9kYWwoKTtcblxuICB2YXIgJGVycm9ySWNvbiA9ICRtb2RhbC5xdWVyeVNlbGVjdG9yKCcuc2EtaW5wdXQtZXJyb3InKTtcbiAgcmVtb3ZlQ2xhc3MoJGVycm9ySWNvbiwgJ3Nob3cnKTtcblxuICB2YXIgJGVycm9yQ29udGFpbmVyID0gJG1vZGFsLnF1ZXJ5U2VsZWN0b3IoJy5zYS1lcnJvci1jb250YWluZXInKTtcbiAgcmVtb3ZlQ2xhc3MoJGVycm9yQ29udGFpbmVyLCAnc2hvdycpO1xufTtcblxuXG4vKlxuICogU2V0IFwibWFyZ2luLXRvcFwiLXByb3BlcnR5IG9uIG1vZGFsIGJhc2VkIG9uIGl0cyBjb21wdXRlZCBoZWlnaHRcbiAqL1xudmFyIGZpeFZlcnRpY2FsUG9zaXRpb24gPSBmdW5jdGlvbigpIHtcbiAgdmFyICRtb2RhbCA9IGdldE1vZGFsKCk7XG4gICRtb2RhbC5zdHlsZS5tYXJnaW5Ub3AgPSBnZXRUb3BNYXJnaW4oZ2V0TW9kYWwoKSk7XG59O1xuXG5cbmV4cG9ydCB7IFxuICBzd2VldEFsZXJ0SW5pdGlhbGl6ZSxcbiAgZ2V0TW9kYWwsXG4gIGdldE92ZXJsYXksXG4gIGdldElucHV0LFxuICBzZXRGb2N1c1N0eWxlLFxuICBvcGVuTW9kYWwsXG4gIHJlc2V0SW5wdXQsXG4gIHJlc2V0SW5wdXRFcnJvcixcbiAgZml4VmVydGljYWxQb3NpdGlvblxufTtcbiIsInZhciBpbmplY3RlZEhUTUwgPSBcblxuICAvLyBEYXJrIG92ZXJsYXlcbiAgYDxkaXYgY2xhc3M9XCJzd2VldC1vdmVybGF5XCIgdGFiSW5kZXg9XCItMVwiPjwvZGl2PmAgK1xuXG4gIC8vIE1vZGFsXG4gIGA8ZGl2IGNsYXNzPVwic3dlZXQtYWxlcnRcIj5gICtcblxuICAgIC8vIEVycm9yIGljb25cbiAgICBgPGRpdiBjbGFzcz1cInNhLWljb24gc2EtZXJyb3JcIj5cbiAgICAgIDxzcGFuIGNsYXNzPVwic2EteC1tYXJrXCI+XG4gICAgICAgIDxzcGFuIGNsYXNzPVwic2EtbGluZSBzYS1sZWZ0XCI+PC9zcGFuPlxuICAgICAgICA8c3BhbiBjbGFzcz1cInNhLWxpbmUgc2EtcmlnaHRcIj48L3NwYW4+XG4gICAgICA8L3NwYW4+XG4gICAgPC9kaXY+YCArXG5cbiAgICAvLyBXYXJuaW5nIGljb25cbiAgICBgPGRpdiBjbGFzcz1cInNhLWljb24gc2Etd2FybmluZ1wiPlxuICAgICAgPHNwYW4gY2xhc3M9XCJzYS1ib2R5XCI+PC9zcGFuPlxuICAgICAgPHNwYW4gY2xhc3M9XCJzYS1kb3RcIj48L3NwYW4+XG4gICAgPC9kaXY+YCArXG5cbiAgICAvLyBJbmZvIGljb25cbiAgICBgPGRpdiBjbGFzcz1cInNhLWljb24gc2EtaW5mb1wiPjwvZGl2PmAgK1xuXG4gICAgLy8gU3VjY2VzcyBpY29uXG4gICAgYDxkaXYgY2xhc3M9XCJzYS1pY29uIHNhLXN1Y2Nlc3NcIj5cbiAgICAgIDxzcGFuIGNsYXNzPVwic2EtbGluZSBzYS10aXBcIj48L3NwYW4+XG4gICAgICA8c3BhbiBjbGFzcz1cInNhLWxpbmUgc2EtbG9uZ1wiPjwvc3Bhbj5cblxuICAgICAgPGRpdiBjbGFzcz1cInNhLXBsYWNlaG9sZGVyXCI+PC9kaXY+XG4gICAgICA8ZGl2IGNsYXNzPVwic2EtZml4XCI+PC9kaXY+XG4gICAgPC9kaXY+YCArXG5cbiAgICBgPGRpdiBjbGFzcz1cInNhLWljb24gc2EtY3VzdG9tXCI+PC9kaXY+YCArXG5cbiAgICAvLyBUaXRsZSwgdGV4dCBhbmQgaW5wdXRcbiAgICBgPGgyPlRpdGxlPC9oMj5cbiAgICA8cD5UZXh0PC9wPlxuICAgIDxmaWVsZHNldD5cbiAgICAgIDxpbnB1dCB0eXBlPVwidGV4dFwiIHRhYkluZGV4PVwiM1wiIC8+XG4gICAgICA8ZGl2IGNsYXNzPVwic2EtaW5wdXQtZXJyb3JcIj48L2Rpdj5cbiAgICA8L2ZpZWxkc2V0PmAgK1xuXG4gICAgLy8gSW5wdXQgZXJyb3JzXG4gICAgYDxkaXYgY2xhc3M9XCJzYS1lcnJvci1jb250YWluZXJcIj5cbiAgICAgIDxkaXYgY2xhc3M9XCJpY29uXCI+ITwvZGl2PlxuICAgICAgPHA+Tm90IHZhbGlkITwvcD5cbiAgICA8L2Rpdj5gICtcblxuICAgIC8vIENhbmNlbCBhbmQgY29uZmlybSBidXR0b25zXG4gICAgYDxkaXYgY2xhc3M9XCJzYS1idXR0b24tY29udGFpbmVyXCI+XG4gICAgICA8YnV0dG9uIGNsYXNzPVwiY2FuY2VsXCIgdGFiSW5kZXg9XCIyXCI+Q2FuY2VsPC9idXR0b24+XG4gICAgICA8ZGl2IGNsYXNzPVwic2EtY29uZmlybS1idXR0b24tY29udGFpbmVyXCI+XG4gICAgICAgIDxidXR0b24gY2xhc3M9XCJjb25maXJtXCIgdGFiSW5kZXg9XCIxXCI+T0s8L2J1dHRvbj5gICsgXG5cbiAgICAgICAgLy8gTG9hZGluZyBhbmltYXRpb25cbiAgICAgICAgYDxkaXYgY2xhc3M9XCJsYS1iYWxsLWZhbGxcIj5cbiAgICAgICAgICA8ZGl2PjwvZGl2PlxuICAgICAgICAgIDxkaXY+PC9kaXY+XG4gICAgICAgICAgPGRpdj48L2Rpdj5cbiAgICAgICAgPC9kaXY+XG4gICAgICA8L2Rpdj5cbiAgICA8L2Rpdj5gICtcblxuICAvLyBFbmQgb2YgbW9kYWxcbiAgYDwvZGl2PmA7XG5cbmV4cG9ydCBkZWZhdWx0IGluamVjdGVkSFRNTDtcbiIsInZhciBhbGVydFR5cGVzID0gWydlcnJvcicsICd3YXJuaW5nJywgJ2luZm8nLCAnc3VjY2VzcycsICdpbnB1dCcsICdwcm9tcHQnXTtcblxuaW1wb3J0IHtcbiAgaXNJRThcbn0gZnJvbSAnLi91dGlscyc7XG5cbmltcG9ydCB7XG4gIGdldE1vZGFsLFxuICBnZXRJbnB1dCxcbiAgc2V0Rm9jdXNTdHlsZVxufSBmcm9tICcuL2hhbmRsZS1zd2FsLWRvbSc7XG5cbmltcG9ydCB7XG4gIGhhc0NsYXNzLCBhZGRDbGFzcywgcmVtb3ZlQ2xhc3MsXG4gIGVzY2FwZUh0bWwsXG4gIF9zaG93LCBzaG93LCBfaGlkZSwgaGlkZVxufSBmcm9tICcuL2hhbmRsZS1kb20nO1xuXG5cbi8qXG4gKiBTZXQgdHlwZSwgdGV4dCBhbmQgYWN0aW9ucyBvbiBtb2RhbFxuICovXG52YXIgc2V0UGFyYW1ldGVycyA9IGZ1bmN0aW9uKHBhcmFtcykge1xuICB2YXIgbW9kYWwgPSBnZXRNb2RhbCgpO1xuXG4gIHZhciAkdGl0bGUgPSBtb2RhbC5xdWVyeVNlbGVjdG9yKCdoMicpO1xuICB2YXIgJHRleHQgPSBtb2RhbC5xdWVyeVNlbGVjdG9yKCdwJyk7XG4gIHZhciAkY2FuY2VsQnRuID0gbW9kYWwucXVlcnlTZWxlY3RvcignYnV0dG9uLmNhbmNlbCcpO1xuICB2YXIgJGNvbmZpcm1CdG4gPSBtb2RhbC5xdWVyeVNlbGVjdG9yKCdidXR0b24uY29uZmlybScpO1xuXG4gIC8qXG4gICAqIFRpdGxlXG4gICAqL1xuICAkdGl0bGUuaW5uZXJIVE1MID0gcGFyYW1zLmh0bWwgPyBwYXJhbXMudGl0bGUgOiBlc2NhcGVIdG1sKHBhcmFtcy50aXRsZSkuc3BsaXQoJ1xcbicpLmpvaW4oJzxicj4nKTtcblxuICAvKlxuICAgKiBUZXh0XG4gICAqL1xuICAkdGV4dC5pbm5lckhUTUwgPSBwYXJhbXMuaHRtbCA/IHBhcmFtcy50ZXh0IDogZXNjYXBlSHRtbChwYXJhbXMudGV4dCB8fCAnJykuc3BsaXQoJ1xcbicpLmpvaW4oJzxicj4nKTtcbiAgaWYgKHBhcmFtcy50ZXh0KSBzaG93KCR0ZXh0KTtcblxuICAvKlxuICAgKiBDdXN0b20gY2xhc3NcbiAgICovXG4gIGlmIChwYXJhbXMuY3VzdG9tQ2xhc3MpIHtcbiAgICBhZGRDbGFzcyhtb2RhbCwgcGFyYW1zLmN1c3RvbUNsYXNzKTtcbiAgICBtb2RhbC5zZXRBdHRyaWJ1dGUoJ2RhdGEtY3VzdG9tLWNsYXNzJywgcGFyYW1zLmN1c3RvbUNsYXNzKTtcbiAgfSBlbHNlIHtcbiAgICAvLyBGaW5kIHByZXZpb3VzbHkgc2V0IGNsYXNzZXMgYW5kIHJlbW92ZSB0aGVtXG4gICAgbGV0IGN1c3RvbUNsYXNzID0gbW9kYWwuZ2V0QXR0cmlidXRlKCdkYXRhLWN1c3RvbS1jbGFzcycpO1xuICAgIHJlbW92ZUNsYXNzKG1vZGFsLCBjdXN0b21DbGFzcyk7XG4gICAgbW9kYWwuc2V0QXR0cmlidXRlKCdkYXRhLWN1c3RvbS1jbGFzcycsICcnKTtcbiAgfVxuXG4gIC8qXG4gICAqIEljb25cbiAgICovXG4gIGhpZGUobW9kYWwucXVlcnlTZWxlY3RvckFsbCgnLnNhLWljb24nKSk7XG5cbiAgaWYgKHBhcmFtcy50eXBlICYmICFpc0lFOCgpKSB7XG5cbiAgICBsZXQgdmFsaWRUeXBlID0gZmFsc2U7XG5cbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IGFsZXJ0VHlwZXMubGVuZ3RoOyBpKyspIHtcbiAgICAgIGlmIChwYXJhbXMudHlwZSA9PT0gYWxlcnRUeXBlc1tpXSkge1xuICAgICAgICB2YWxpZFR5cGUgPSB0cnVlO1xuICAgICAgICBicmVhaztcbiAgICAgIH1cbiAgICB9XG5cbiAgICBpZiAoIXZhbGlkVHlwZSkge1xuICAgICAgbG9nU3RyKCdVbmtub3duIGFsZXJ0IHR5cGU6ICcgKyBwYXJhbXMudHlwZSk7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuXG4gICAgbGV0IHR5cGVzV2l0aEljb25zID0gWydzdWNjZXNzJywgJ2Vycm9yJywgJ3dhcm5pbmcnLCAnaW5mbyddO1xuICAgIGxldCAkaWNvbjtcblxuICAgIGlmICh0eXBlc1dpdGhJY29ucy5pbmRleE9mKHBhcmFtcy50eXBlKSAhPT0gLTEpIHtcbiAgICAgICRpY29uID0gbW9kYWwucXVlcnlTZWxlY3RvcignLnNhLWljb24uJyArICdzYS0nICsgcGFyYW1zLnR5cGUpO1xuICAgICAgc2hvdygkaWNvbik7XG4gICAgfVxuXG4gICAgbGV0ICRpbnB1dCA9IGdldElucHV0KCk7XG5cbiAgICAvLyBBbmltYXRlIGljb25cbiAgICBzd2l0Y2ggKHBhcmFtcy50eXBlKSB7XG5cbiAgICAgIGNhc2UgJ3N1Y2Nlc3MnOlxuICAgICAgICBhZGRDbGFzcygkaWNvbiwgJ2FuaW1hdGUnKTtcbiAgICAgICAgYWRkQ2xhc3MoJGljb24ucXVlcnlTZWxlY3RvcignLnNhLXRpcCcpLCAnYW5pbWF0ZVN1Y2Nlc3NUaXAnKTtcbiAgICAgICAgYWRkQ2xhc3MoJGljb24ucXVlcnlTZWxlY3RvcignLnNhLWxvbmcnKSwgJ2FuaW1hdGVTdWNjZXNzTG9uZycpO1xuICAgICAgICBicmVhaztcblxuICAgICAgY2FzZSAnZXJyb3InOlxuICAgICAgICBhZGRDbGFzcygkaWNvbiwgJ2FuaW1hdGVFcnJvckljb24nKTtcbiAgICAgICAgYWRkQ2xhc3MoJGljb24ucXVlcnlTZWxlY3RvcignLnNhLXgtbWFyaycpLCAnYW5pbWF0ZVhNYXJrJyk7XG4gICAgICAgIGJyZWFrO1xuXG4gICAgICBjYXNlICd3YXJuaW5nJzpcbiAgICAgICAgYWRkQ2xhc3MoJGljb24sICdwdWxzZVdhcm5pbmcnKTtcbiAgICAgICAgYWRkQ2xhc3MoJGljb24ucXVlcnlTZWxlY3RvcignLnNhLWJvZHknKSwgJ3B1bHNlV2FybmluZ0lucycpO1xuICAgICAgICBhZGRDbGFzcygkaWNvbi5xdWVyeVNlbGVjdG9yKCcuc2EtZG90JyksICdwdWxzZVdhcm5pbmdJbnMnKTtcbiAgICAgICAgYnJlYWs7XG5cbiAgICAgIGNhc2UgJ2lucHV0JzpcbiAgICAgIGNhc2UgJ3Byb21wdCc6XG4gICAgICAgICRpbnB1dC5zZXRBdHRyaWJ1dGUoJ3R5cGUnLCBwYXJhbXMuaW5wdXRUeXBlKTtcbiAgICAgICAgJGlucHV0LnZhbHVlID0gcGFyYW1zLmlucHV0VmFsdWU7XG4gICAgICAgICRpbnB1dC5zZXRBdHRyaWJ1dGUoJ3BsYWNlaG9sZGVyJywgcGFyYW1zLmlucHV0UGxhY2Vob2xkZXIpO1xuICAgICAgICBhZGRDbGFzcyhtb2RhbCwgJ3Nob3ctaW5wdXQnKTtcbiAgICAgICAgc2V0VGltZW91dChmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgJGlucHV0LmZvY3VzKCk7XG4gICAgICAgICAgJGlucHV0LmFkZEV2ZW50TGlzdGVuZXIoJ2tleXVwJywgc3dhbC5yZXNldElucHV0RXJyb3IpO1xuICAgICAgICB9LCA0MDApO1xuICAgICAgICBicmVhaztcbiAgICB9XG4gIH1cblxuICAvKlxuICAgKiBDdXN0b20gaW1hZ2VcbiAgICovXG4gIGlmIChwYXJhbXMuaW1hZ2VVcmwpIHtcbiAgICBsZXQgJGN1c3RvbUljb24gPSBtb2RhbC5xdWVyeVNlbGVjdG9yKCcuc2EtaWNvbi5zYS1jdXN0b20nKTtcblxuICAgICRjdXN0b21JY29uLnN0eWxlLmJhY2tncm91bmRJbWFnZSA9ICd1cmwoJyArIHBhcmFtcy5pbWFnZVVybCArICcpJztcbiAgICBzaG93KCRjdXN0b21JY29uKTtcblxuICAgIGxldCBfaW1nV2lkdGggPSA4MDtcbiAgICBsZXQgX2ltZ0hlaWdodCA9IDgwO1xuXG4gICAgaWYgKHBhcmFtcy5pbWFnZVNpemUpIHtcbiAgICAgIGxldCBkaW1lbnNpb25zID0gcGFyYW1zLmltYWdlU2l6ZS50b1N0cmluZygpLnNwbGl0KCd4Jyk7XG4gICAgICBsZXQgaW1nV2lkdGggPSBkaW1lbnNpb25zWzBdO1xuICAgICAgbGV0IGltZ0hlaWdodCA9IGRpbWVuc2lvbnNbMV07XG5cbiAgICAgIGlmICghaW1nV2lkdGggfHwgIWltZ0hlaWdodCkge1xuICAgICAgICBsb2dTdHIoJ1BhcmFtZXRlciBpbWFnZVNpemUgZXhwZWN0cyB2YWx1ZSB3aXRoIGZvcm1hdCBXSURUSHhIRUlHSFQsIGdvdCAnICsgcGFyYW1zLmltYWdlU2l6ZSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBfaW1nV2lkdGggPSBpbWdXaWR0aDtcbiAgICAgICAgX2ltZ0hlaWdodCA9IGltZ0hlaWdodDtcbiAgICAgIH1cbiAgICB9XG5cbiAgICAkY3VzdG9tSWNvbi5zZXRBdHRyaWJ1dGUoJ3N0eWxlJywgJGN1c3RvbUljb24uZ2V0QXR0cmlidXRlKCdzdHlsZScpICsgJ3dpZHRoOicgKyBfaW1nV2lkdGggKyAncHg7IGhlaWdodDonICsgX2ltZ0hlaWdodCArICdweCcpO1xuICB9XG5cbiAgLypcbiAgICogU2hvdyBjYW5jZWwgYnV0dG9uP1xuICAgKi9cbiAgbW9kYWwuc2V0QXR0cmlidXRlKCdkYXRhLWhhcy1jYW5jZWwtYnV0dG9uJywgcGFyYW1zLnNob3dDYW5jZWxCdXR0b24pO1xuICBpZiAocGFyYW1zLnNob3dDYW5jZWxCdXR0b24pIHtcbiAgICAkY2FuY2VsQnRuLnN0eWxlLmRpc3BsYXkgPSAnaW5saW5lLWJsb2NrJztcbiAgfSBlbHNlIHtcbiAgICBoaWRlKCRjYW5jZWxCdG4pO1xuICB9XG5cbiAgLypcbiAgICogU2hvdyBjb25maXJtIGJ1dHRvbj9cbiAgICovXG4gIG1vZGFsLnNldEF0dHJpYnV0ZSgnZGF0YS1oYXMtY29uZmlybS1idXR0b24nLCBwYXJhbXMuc2hvd0NvbmZpcm1CdXR0b24pO1xuICBpZiAocGFyYW1zLnNob3dDb25maXJtQnV0dG9uKSB7XG4gICAgJGNvbmZpcm1CdG4uc3R5bGUuZGlzcGxheSA9ICdpbmxpbmUtYmxvY2snO1xuICB9IGVsc2Uge1xuICAgIGhpZGUoJGNvbmZpcm1CdG4pO1xuICB9XG5cbiAgLypcbiAgICogQ3VzdG9tIHRleHQgb24gY2FuY2VsL2NvbmZpcm0gYnV0dG9uc1xuICAgKi9cbiAgaWYgKHBhcmFtcy5jYW5jZWxCdXR0b25UZXh0KSB7XG4gICAgJGNhbmNlbEJ0bi5pbm5lckhUTUwgPSBlc2NhcGVIdG1sKHBhcmFtcy5jYW5jZWxCdXR0b25UZXh0KTtcbiAgfVxuICBpZiAocGFyYW1zLmNvbmZpcm1CdXR0b25UZXh0KSB7XG4gICAgJGNvbmZpcm1CdG4uaW5uZXJIVE1MID0gZXNjYXBlSHRtbChwYXJhbXMuY29uZmlybUJ1dHRvblRleHQpO1xuICB9XG5cbiAgLypcbiAgICogQ3VzdG9tIGNvbG9yIG9uIGNvbmZpcm0gYnV0dG9uXG4gICAqL1xuICBpZiAocGFyYW1zLmNvbmZpcm1CdXR0b25Db2xvcikge1xuICAgIC8vIFNldCBjb25maXJtIGJ1dHRvbiB0byBzZWxlY3RlZCBiYWNrZ3JvdW5kIGNvbG9yXG4gICAgJGNvbmZpcm1CdG4uc3R5bGUuYmFja2dyb3VuZENvbG9yID0gcGFyYW1zLmNvbmZpcm1CdXR0b25Db2xvcjtcblxuICAgIC8vIFNldCB0aGUgY29uZmlybSBidXR0b24gY29sb3IgdG8gdGhlIGxvYWRpbmcgcmluZ1xuICAgICRjb25maXJtQnRuLnN0eWxlLmJvcmRlckxlZnRDb2xvciA9IHBhcmFtcy5jb25maXJtTG9hZGluZ0J1dHRvbkNvbG9yO1xuICAgICRjb25maXJtQnRuLnN0eWxlLmJvcmRlclJpZ2h0Q29sb3IgPSBwYXJhbXMuY29uZmlybUxvYWRpbmdCdXR0b25Db2xvcjtcblxuICAgIC8vIFNldCBib3gtc2hhZG93IHRvIGRlZmF1bHQgZm9jdXNlZCBidXR0b25cbiAgICBzZXRGb2N1c1N0eWxlKCRjb25maXJtQnRuLCBwYXJhbXMuY29uZmlybUJ1dHRvbkNvbG9yKTtcbiAgfVxuXG4gIC8qXG4gICAqIEFsbG93IG91dHNpZGUgY2xpY2tcbiAgICovXG4gIG1vZGFsLnNldEF0dHJpYnV0ZSgnZGF0YS1hbGxvdy1vdXRzaWRlLWNsaWNrJywgcGFyYW1zLmFsbG93T3V0c2lkZUNsaWNrKTtcblxuICAvKlxuICAgKiBDYWxsYmFjayBmdW5jdGlvblxuICAgKi9cbiAgdmFyIGhhc0RvbmVGdW5jdGlvbiA9IHBhcmFtcy5kb25lRnVuY3Rpb24gPyB0cnVlIDogZmFsc2U7XG4gIG1vZGFsLnNldEF0dHJpYnV0ZSgnZGF0YS1oYXMtZG9uZS1mdW5jdGlvbicsIGhhc0RvbmVGdW5jdGlvbik7XG5cbiAgLypcbiAgICogQW5pbWF0aW9uXG4gICAqL1xuICBpZiAoIXBhcmFtcy5hbmltYXRpb24pIHtcbiAgICBtb2RhbC5zZXRBdHRyaWJ1dGUoJ2RhdGEtYW5pbWF0aW9uJywgJ25vbmUnKTtcbiAgfSBlbHNlIGlmICh0eXBlb2YgcGFyYW1zLmFuaW1hdGlvbiA9PT0gJ3N0cmluZycpIHtcbiAgICBtb2RhbC5zZXRBdHRyaWJ1dGUoJ2RhdGEtYW5pbWF0aW9uJywgcGFyYW1zLmFuaW1hdGlvbik7IC8vIEN1c3RvbSBhbmltYXRpb25cbiAgfSBlbHNlIHtcbiAgICBtb2RhbC5zZXRBdHRyaWJ1dGUoJ2RhdGEtYW5pbWF0aW9uJywgJ3BvcCcpO1xuICB9XG5cbiAgLypcbiAgICogVGltZXJcbiAgICovXG4gIG1vZGFsLnNldEF0dHJpYnV0ZSgnZGF0YS10aW1lcicsIHBhcmFtcy50aW1lcik7XG59O1xuXG5leHBvcnQgZGVmYXVsdCBzZXRQYXJhbWV0ZXJzO1xuIiwiLypcbiAqIEFsbG93IHVzZXIgdG8gcGFzcyB0aGVpciBvd24gcGFyYW1zXG4gKi9cbnZhciBleHRlbmQgPSBmdW5jdGlvbihhLCBiKSB7XG4gIGZvciAodmFyIGtleSBpbiBiKSB7XG4gICAgaWYgKGIuaGFzT3duUHJvcGVydHkoa2V5KSkge1xuICAgICAgYVtrZXldID0gYltrZXldO1xuICAgIH1cbiAgfVxuICByZXR1cm4gYTtcbn07XG5cbi8qXG4gKiBDb252ZXJ0IEhFWCBjb2RlcyB0byBSR0IgdmFsdWVzICgjMDAwMDAwIC0+IHJnYigwLDAsMCkpXG4gKi9cbnZhciBoZXhUb1JnYiA9IGZ1bmN0aW9uKGhleCkge1xuICB2YXIgcmVzdWx0ID0gL14jPyhbYS1mXFxkXXsyfSkoW2EtZlxcZF17Mn0pKFthLWZcXGRdezJ9KSQvaS5leGVjKGhleCk7XG4gIHJldHVybiByZXN1bHQgPyBwYXJzZUludChyZXN1bHRbMV0sIDE2KSArICcsICcgKyBwYXJzZUludChyZXN1bHRbMl0sIDE2KSArICcsICcgKyBwYXJzZUludChyZXN1bHRbM10sIDE2KSA6IG51bGw7XG59O1xuXG4vKlxuICogQ2hlY2sgaWYgdGhlIHVzZXIgaXMgdXNpbmcgSW50ZXJuZXQgRXhwbG9yZXIgOCAoZm9yIGZhbGxiYWNrcylcbiAqL1xudmFyIGlzSUU4ID0gZnVuY3Rpb24oKSB7XG4gIHJldHVybiAod2luZG93LmF0dGFjaEV2ZW50ICYmICF3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcik7XG59O1xuXG4vKlxuICogSUUgY29tcGF0aWJsZSBsb2dnaW5nIGZvciBkZXZlbG9wZXJzXG4gKi9cbnZhciBsb2dTdHIgPSBmdW5jdGlvbihzdHJpbmcpIHtcbiAgaWYgKHdpbmRvdy5jb25zb2xlKSB7XG4gICAgLy8gSUUuLi5cbiAgICB3aW5kb3cuY29uc29sZS5sb2coJ1N3ZWV0QWxlcnQ6ICcgKyBzdHJpbmcpO1xuICB9XG59O1xuXG4vKlxuICogU2V0IGhvdmVyLCBhY3RpdmUgYW5kIGZvY3VzLXN0YXRlcyBmb3IgYnV0dG9ucyBcbiAqIChzb3VyY2U6IGh0dHA6Ly93d3cuc2l0ZXBvaW50LmNvbS9qYXZhc2NyaXB0LWdlbmVyYXRlLWxpZ2h0ZXItZGFya2VyLWNvbG9yKVxuICovXG52YXIgY29sb3JMdW1pbmFuY2UgPSBmdW5jdGlvbihoZXgsIGx1bSkge1xuICAvLyBWYWxpZGF0ZSBoZXggc3RyaW5nXG4gIGhleCA9IFN0cmluZyhoZXgpLnJlcGxhY2UoL1teMC05YS1mXS9naSwgJycpO1xuICBpZiAoaGV4Lmxlbmd0aCA8IDYpIHtcbiAgICBoZXggPSBoZXhbMF0gKyBoZXhbMF0gKyBoZXhbMV0gKyBoZXhbMV0gKyBoZXhbMl0gKyBoZXhbMl07XG4gIH1cbiAgbHVtID0gbHVtIHx8IDA7XG5cbiAgLy8gQ29udmVydCB0byBkZWNpbWFsIGFuZCBjaGFuZ2UgbHVtaW5vc2l0eVxuICB2YXIgcmdiID0gJyMnO1xuICB2YXIgYztcbiAgdmFyIGk7XG5cbiAgZm9yIChpID0gMDsgaSA8IDM7IGkrKykge1xuICAgIGMgPSBwYXJzZUludChoZXguc3Vic3RyKGkgKiAyLCAyKSwgMTYpO1xuICAgIGMgPSBNYXRoLnJvdW5kKE1hdGgubWluKE1hdGgubWF4KDAsIGMgKyBjICogbHVtKSwgMjU1KSkudG9TdHJpbmcoMTYpO1xuICAgIHJnYiArPSAoJzAwJyArIGMpLnN1YnN0cihjLmxlbmd0aCk7XG4gIH1cblxuICByZXR1cm4gcmdiO1xufTtcblxuXG5leHBvcnQge1xuICBleHRlbmQsXG4gIGhleFRvUmdiLFxuICBpc0lFOCxcbiAgbG9nU3RyLFxuICBjb2xvckx1bWluYW5jZVxufTtcbiJdfQ==


    /*
     * Use SweetAlert with RequireJS
     */

    if (typeof define === 'function' && define.amd) {
        define(function () {
            return sweetAlert;
        });
    } else if (typeof module !== 'undefined' && module.exports) {
        module.exports = sweetAlert;
    }

})(window, document);
/* Storage */
!function (name, context, factory) {
    if (typeof define === 'function' && define.amd) {
        define(factory);
    } else if (typeof module !== 'undefined' && module.exports) {
        module.exports = factory();
    } else {
        context[name] = factory();
    }
}('storageWrap', this, function () {
    'use strict';

    if (!'Storage' in window) {
        return console && void 0;
    }

    return {
        setAdaptor: function (adaptor) {
            this._adaptor = adaptor;
        },
        getItem: function (key) {
            var item = this._adaptor.getItem(key);
            try {
                item = JSON.parse(item);
            } catch (e) {
            }

            return item;
        },
        setItem: function (key, value) {
            var type = this._toType(value);
            if (/object|array/.test(type)) {
                value = JSON.stringify(value);
            }

            this._adaptor.setItem(key, value);
        },
        removeItem: function (key) {
            this._adaptor.removeItem(key);
        },
        getSpace: function (opt_key) {

            var allocatedMemory = 0,
                    // It's also possible to get window.sessionStorage.
                    STORAGE = this._adaptor,
                    key;
            if (!STORAGE) {
                // Web storage is not supported by the browser,
                // returning 0, therefore.
                return allocatedMemory;
            }

            for (key in STORAGE) {
                if (STORAGE.hasOwnProperty(key) && (!opt_key || opt_key === key)) {
                    allocatedMemory += (STORAGE[key].length * 2) / 1024 / 1024;
                }
            }

            return parseFloat(allocatedMemory.toFixed(2));
        },
        _adaptor: localStorage,
        _toType: function (obj) {
            return ({}).toString.call(obj).
                    match(/\s([a-z|A-Z]+)/)[1].toLowerCase();
        }
    }
});
/* Array Unique*/
Array.prototype.unique = function () {
    var n = {},
            r = [];
    for (var i = 0; i < this.length; i++)
    {
        if (!n[this[i]])
        {
            n[this[i]] = true;
            r.push(this[i]);
        }
    }
    return r;
}

$.fn.serializeObject = function ()
{
    var o = {};
    var a = this.serializeArray();
    $.each(a, function () {
        if (o[this.name] !== undefined) {
            if (!o[this.name].push) {
                o[this.name] = [o[this.name]];
            }
            o[this.name].push(this.value || '');
        } else {
            o[this.name] = this.value || '';
        }
    });
    return o;
};

String.prototype.trunc =
     function( n, useWordBoundary ){
         var isTooLong = this.length > n,
             s_ = isTooLong ? this.substr(0,n-1) : this;
         s_ = (useWordBoundary && isTooLong) ? s_.substr(0,s_.lastIndexOf(' ')) : s_;
         return  isTooLong ? s_ + '&hellip;' : s_;
      };

//
// console.log(storageWrap);
//
// localStorageWrap = storageWrap;
//
// localStorageWrap.setAdaptor(sessionStorage);
//
// console.log(localStorageWrap);

/*!
 * mustache.js - Logic-less {{mustache}} templates with JavaScript
 * http://github.com/janl/mustache.js
 */

/*global define: false Mustache: true*/

(function defineMustache (global, factory) {
  if (typeof exports === 'object' && exports && typeof exports.nodeName !== 'string') {
    factory(exports); // CommonJS
  } else if (typeof define === 'function' && define.amd) {
    define(['exports'], factory); // AMD
  } else {
    global.Mustache = {};
    factory(Mustache); // script, wsh, asp
  }
}(this, function mustacheFactory (mustache) {

  var objectToString = Object.prototype.toString;
  var isArray = Array.isArray || function isArrayPolyfill (object) {
    return objectToString.call(object) === '[object Array]';
  };

  function isFunction (object) {
    return typeof object === 'function';
  }

  /**
   * More correct typeof string handling array
   * which normally returns typeof 'object'
   */
  function typeStr (obj) {
    return isArray(obj) ? 'array' : typeof obj;
  }

  function escapeRegExp (string) {
    return string.replace(/[\-\[\]{}()*+?.,\\\^$|#\s]/g, '\\$&');
  }

  /**
   * Null safe way of checking whether or not an object,
   * including its prototype, has a given property
   */
  function hasProperty (obj, propName) {
    return obj != null && typeof obj === 'object' && (propName in obj);
  }

  // Workaround for https://issues.apache.org/jira/browse/COUCHDB-577
  // See https://github.com/janl/mustache.js/issues/189
  var regExpTest = RegExp.prototype.test;
  function testRegExp (re, string) {
    return regExpTest.call(re, string);
  }

  var nonSpaceRe = /\S/;
  function isWhitespace (string) {
    return !testRegExp(nonSpaceRe, string);
  }

  var entityMap = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
    '/': '&#x2F;'
  };

  function escapeHtml (string) {
    return String(string).replace(/[&<>"'\/]/g, function fromEntityMap (s) {
      return entityMap[s];
    });
  }

  var whiteRe = /\s*/;
  var spaceRe = /\s+/;
  var equalsRe = /\s*=/;
  var curlyRe = /\s*\}/;
  var tagRe = /#|\^|\/|>|\{|&|=|!/;

  /**
   * Breaks up the given `template` string into a tree of tokens. If the `tags`
   * argument is given here it must be an array with two string values: the
   * opening and closing tags used in the template (e.g. [ "<%", "%>" ]). Of
   * course, the default is to use mustaches (i.e. mustache.tags).
   *
   * A token is an array with at least 4 elements. The first element is the
   * mustache symbol that was used inside the tag, e.g. "#" or "&". If the tag
   * did not contain a symbol (i.e. {{myValue}}) this element is "name". For
   * all text that appears outside a symbol this element is "text".
   *
   * The second element of a token is its "value". For mustache tags this is
   * whatever else was inside the tag besides the opening symbol. For text tokens
   * this is the text itself.
   *
   * The third and fourth elements of the token are the start and end indices,
   * respectively, of the token in the original template.
   *
   * Tokens that are the root node of a subtree contain two more elements: 1) an
   * array of tokens in the subtree and 2) the index in the original template at
   * which the closing tag for that section begins.
   */
  function parseTemplate (template, tags) {
    if (!template)
      return [];

    var sections = [];     // Stack to hold section tokens
    var tokens = [];       // Buffer to hold the tokens
    var spaces = [];       // Indices of whitespace tokens on the current line
    var hasTag = false;    // Is there a {{tag}} on the current line?
    var nonSpace = false;  // Is there a non-space char on the current line?

    // Strips all whitespace tokens array for the current line
    // if there was a {{#tag}} on it and otherwise only space.
    function stripSpace () {
      if (hasTag && !nonSpace) {
        while (spaces.length)
          delete tokens[spaces.pop()];
      } else {
        spaces = [];
      }

      hasTag = false;
      nonSpace = false;
    }

    var openingTagRe, closingTagRe, closingCurlyRe;
    function compileTags (tagsToCompile) {
      if (typeof tagsToCompile === 'string')
        tagsToCompile = tagsToCompile.split(spaceRe, 2);

      if (!isArray(tagsToCompile) || tagsToCompile.length !== 2)
        throw new Error('Invalid tags: ' + tagsToCompile);

      openingTagRe = new RegExp(escapeRegExp(tagsToCompile[0]) + '\\s*');
      closingTagRe = new RegExp('\\s*' + escapeRegExp(tagsToCompile[1]));
      closingCurlyRe = new RegExp('\\s*' + escapeRegExp('}' + tagsToCompile[1]));
    }

    compileTags(tags || mustache.tags);

    var scanner = new Scanner(template);

    var start, type, value, chr, token, openSection;
    while (!scanner.eos()) {
      start = scanner.pos;

      // Match any text between tags.
      value = scanner.scanUntil(openingTagRe);

      if (value) {
        for (var i = 0, valueLength = value.length; i < valueLength; ++i) {
          chr = value.charAt(i);

          if (isWhitespace(chr)) {
            spaces.push(tokens.length);
          } else {
            nonSpace = true;
          }

          tokens.push([ 'text', chr, start, start + 1 ]);
          start += 1;

          // Check for whitespace on the current line.
          if (chr === '\n')
            stripSpace();
        }
      }

      // Match the opening tag.
      if (!scanner.scan(openingTagRe))
        break;

      hasTag = true;

      // Get the tag type.
      type = scanner.scan(tagRe) || 'name';
      scanner.scan(whiteRe);

      // Get the tag value.
      if (type === '=') {
        value = scanner.scanUntil(equalsRe);
        scanner.scan(equalsRe);
        scanner.scanUntil(closingTagRe);
      } else if (type === '{') {
        value = scanner.scanUntil(closingCurlyRe);
        scanner.scan(curlyRe);
        scanner.scanUntil(closingTagRe);
        type = '&';
      } else {
        value = scanner.scanUntil(closingTagRe);
      }

      // Match the closing tag.
      if (!scanner.scan(closingTagRe))
        throw new Error('Unclosed tag at ' + scanner.pos);

      token = [ type, value, start, scanner.pos ];
      tokens.push(token);

      if (type === '#' || type === '^') {
        sections.push(token);
      } else if (type === '/') {
        // Check section nesting.
        openSection = sections.pop();

        if (!openSection)
          throw new Error('Unopened section "' + value + '" at ' + start);

        if (openSection[1] !== value)
          throw new Error('Unclosed section "' + openSection[1] + '" at ' + start);
      } else if (type === 'name' || type === '{' || type === '&') {
        nonSpace = true;
      } else if (type === '=') {
        // Set the tags for the next time around.
        compileTags(value);
      }
    }

    // Make sure there are no open sections when we're done.
    openSection = sections.pop();

    if (openSection)
      throw new Error('Unclosed section "' + openSection[1] + '" at ' + scanner.pos);

    return nestTokens(squashTokens(tokens));
  }

  /**
   * Combines the values of consecutive text tokens in the given `tokens` array
   * to a single token.
   */
  function squashTokens (tokens) {
    var squashedTokens = [];

    var token, lastToken;
    for (var i = 0, numTokens = tokens.length; i < numTokens; ++i) {
      token = tokens[i];

      if (token) {
        if (token[0] === 'text' && lastToken && lastToken[0] === 'text') {
          lastToken[1] += token[1];
          lastToken[3] = token[3];
        } else {
          squashedTokens.push(token);
          lastToken = token;
        }
      }
    }

    return squashedTokens;
  }

  /**
   * Forms the given array of `tokens` into a nested tree structure where
   * tokens that represent a section have two additional items: 1) an array of
   * all tokens that appear in that section and 2) the index in the original
   * template that represents the end of that section.
   */
  function nestTokens (tokens) {
    var nestedTokens = [];
    var collector = nestedTokens;
    var sections = [];

    var token, section;
    for (var i = 0, numTokens = tokens.length; i < numTokens; ++i) {
      token = tokens[i];

      switch (token[0]) {
      case '#':
      case '^':
        collector.push(token);
        sections.push(token);
        collector = token[4] = [];
        break;
      case '/':
        section = sections.pop();
        section[5] = token[2];
        collector = sections.length > 0 ? sections[sections.length - 1][4] : nestedTokens;
        break;
      default:
        collector.push(token);
      }
    }

    return nestedTokens;
  }

  /**
   * A simple string scanner that is used by the template parser to find
   * tokens in template strings.
   */
  function Scanner (string) {
    this.string = string;
    this.tail = string;
    this.pos = 0;
  }

  /**
   * Returns `true` if the tail is empty (end of string).
   */
  Scanner.prototype.eos = function eos () {
    return this.tail === '';
  };

  /**
   * Tries to match the given regular expression at the current position.
   * Returns the matched text if it can match, the empty string otherwise.
   */
  Scanner.prototype.scan = function scan (re) {
    var match = this.tail.match(re);

    if (!match || match.index !== 0)
      return '';

    var string = match[0];

    this.tail = this.tail.substring(string.length);
    this.pos += string.length;

    return string;
  };

  /**
   * Skips all text until the given regular expression can be matched. Returns
   * the skipped string, which is the entire tail if no match can be made.
   */
  Scanner.prototype.scanUntil = function scanUntil (re) {
    var index = this.tail.search(re), match;

    switch (index) {
    case -1:
      match = this.tail;
      this.tail = '';
      break;
    case 0:
      match = '';
      break;
    default:
      match = this.tail.substring(0, index);
      this.tail = this.tail.substring(index);
    }

    this.pos += match.length;

    return match;
  };

  /**
   * Represents a rendering context by wrapping a view object and
   * maintaining a reference to the parent context.
   */
  function Context (view, parentContext) {
    this.view = view;
    this.cache = { '.': this.view };
    this.parent = parentContext;
  }

  /**
   * Creates a new context using the given view with this context
   * as the parent.
   */
  Context.prototype.push = function push (view) {
    return new Context(view, this);
  };

  /**
   * Returns the value of the given name in this context, traversing
   * up the context hierarchy if the value is absent in this context's view.
   */
  Context.prototype.lookup = function lookup (name) {
    var cache = this.cache;

    var value;
    if (cache.hasOwnProperty(name)) {
      value = cache[name];
    } else {
      var context = this, names, index, lookupHit = false;

      while (context) {
        if (name.indexOf('.') > 0) {
          value = context.view;
          names = name.split('.');
          index = 0;

          /**
           * Using the dot notion path in `name`, we descend through the
           * nested objects.
           *
           * To be certain that the lookup has been successful, we have to
           * check if the last object in the path actually has the property
           * we are looking for. We store the result in `lookupHit`.
           *
           * This is specially necessary for when the value has been set to
           * `undefined` and we want to avoid looking up parent contexts.
           **/
          while (value != null && index < names.length) {
            if (index === names.length - 1)
              lookupHit = hasProperty(value, names[index]);

            value = value[names[index++]];
          }
        } else {
          value = context.view[name];
          lookupHit = hasProperty(context.view, name);
        }

        if (lookupHit)
          break;

        context = context.parent;
      }

      cache[name] = value;
    }

    if (isFunction(value))
      value = value.call(this.view);

    return value;
  };

  /**
   * A Writer knows how to take a stream of tokens and render them to a
   * string, given a context. It also maintains a cache of templates to
   * avoid the need to parse the same template twice.
   */
  function Writer () {
    this.cache = {};
  }

  /**
   * Clears all cached templates in this writer.
   */
  Writer.prototype.clearCache = function clearCache () {
    this.cache = {};
  };

  /**
   * Parses and caches the given `template` and returns the array of tokens
   * that is generated from the parse.
   */
  Writer.prototype.parse = function parse (template, tags) {
    var cache = this.cache;
    var tokens = cache[template];

    if (tokens == null)
      tokens = cache[template] = parseTemplate(template, tags);

    return tokens;
  };

  /**
   * High-level method that is used to render the given `template` with
   * the given `view`.
   *
   * The optional `partials` argument may be an object that contains the
   * names and templates of partials that are used in the template. It may
   * also be a function that is used to load partial templates on the fly
   * that takes a single argument: the name of the partial.
   */
  Writer.prototype.render = function render (template, view, partials) {
    var tokens = this.parse(template);
    var context = (view instanceof Context) ? view : new Context(view);
    return this.renderTokens(tokens, context, partials, template);
  };

  /**
   * Low-level method that renders the given array of `tokens` using
   * the given `context` and `partials`.
   *
   * Note: The `originalTemplate` is only ever used to extract the portion
   * of the original template that was contained in a higher-order section.
   * If the template doesn't use higher-order sections, this argument may
   * be omitted.
   */
  Writer.prototype.renderTokens = function renderTokens (tokens, context, partials, originalTemplate) {
    var buffer = '';

    var token, symbol, value;
    for (var i = 0, numTokens = tokens.length; i < numTokens; ++i) {
      value = undefined;
      token = tokens[i];
      symbol = token[0];

      if (symbol === '#') value = this.renderSection(token, context, partials, originalTemplate);
      else if (symbol === '^') value = this.renderInverted(token, context, partials, originalTemplate);
      else if (symbol === '>') value = this.renderPartial(token, context, partials, originalTemplate);
      else if (symbol === '&') value = this.unescapedValue(token, context);
      else if (symbol === 'name') value = this.escapedValue(token, context);
      else if (symbol === 'text') value = this.rawValue(token);

      if (value !== undefined)
        buffer += value;
    }

    return buffer;
  };

  Writer.prototype.renderSection = function renderSection (token, context, partials, originalTemplate) {
    var self = this;
    var buffer = '';
    var value = context.lookup(token[1]);

    // This function is used to render an arbitrary template
    // in the current context by higher-order sections.
    function subRender (template) {
      return self.render(template, context, partials);
    }

    if (!value) return;

    if (isArray(value)) {
      for (var j = 0, valueLength = value.length; j < valueLength; ++j) {
        buffer += this.renderTokens(token[4], context.push(value[j]), partials, originalTemplate);
      }
    } else if (typeof value === 'object' || typeof value === 'string' || typeof value === 'number') {
      buffer += this.renderTokens(token[4], context.push(value), partials, originalTemplate);
    } else if (isFunction(value)) {
      if (typeof originalTemplate !== 'string')
        throw new Error('Cannot use higher-order sections without the original template');

      // Extract the portion of the original template that the section contains.
      value = value.call(context.view, originalTemplate.slice(token[3], token[5]), subRender);

      if (value != null)
        buffer += value;
    } else {
      buffer += this.renderTokens(token[4], context, partials, originalTemplate);
    }
    return buffer;
  };

  Writer.prototype.renderInverted = function renderInverted (token, context, partials, originalTemplate) {
    var value = context.lookup(token[1]);

    // Use JavaScript's definition of falsy. Include empty arrays.
    // See https://github.com/janl/mustache.js/issues/186
    if (!value || (isArray(value) && value.length === 0))
      return this.renderTokens(token[4], context, partials, originalTemplate);
  };

  Writer.prototype.renderPartial = function renderPartial (token, context, partials) {
    if (!partials) return;

    var value = isFunction(partials) ? partials(token[1]) : partials[token[1]];
    if (value != null)
      return this.renderTokens(this.parse(value), context, partials, value);
  };

  Writer.prototype.unescapedValue = function unescapedValue (token, context) {
    var value = context.lookup(token[1]);
    if (value != null)
      return value;
  };

  Writer.prototype.escapedValue = function escapedValue (token, context) {
    var value = context.lookup(token[1]);
    if (value != null)
      return mustache.escape(value);
  };

  Writer.prototype.rawValue = function rawValue (token) {
    return token[1];
  };

  mustache.name = 'mustache.js';
  mustache.version = '2.1.3';
  mustache.tags = [ '{{', '}}' ];

  // All high-level mustache.* functions use this writer.
  var defaultWriter = new Writer();

  /**
   * Clears all cached templates in the default writer.
   */
  mustache.clearCache = function clearCache () {
    return defaultWriter.clearCache();
  };

  /**
   * Parses and caches the given template in the default writer and returns the
   * array of tokens it contains. Doing this ahead of time avoids the need to
   * parse templates on the fly as they are rendered.
   */
  mustache.parse = function parse (template, tags) {
    return defaultWriter.parse(template, tags);
  };

  /**
   * Renders the `template` with the given `view` and `partials` using the
   * default writer.
   */
  mustache.render = function render (template, view, partials) {
    if (typeof template !== 'string') {
      throw new TypeError('Invalid template! Template should be a "string" ' +
                          'but "' + typeStr(template) + '" was given as the first ' +
                          'argument for mustache#render(template, view, partials)');
    }

    return defaultWriter.render(template, view, partials);
  };

  // This is here for backwards compatibility with 0.4.x.,
  /*eslint-disable */ // eslint wants camel cased function name
  mustache.to_html = function to_html (template, view, partials, send) {
    /*eslint-enable*/

    var result = mustache.render(template, view, partials);

    if (isFunction(send)) {
      send(result);
    } else {
      return result;
    }
  };

  // Export the escaping function so that the user may override it.
  // See https://github.com/janl/mustache.js/issues/244
  mustache.escape = escapeHtml;

  // Export these mainly for testing, but also for advanced usage.
  mustache.Scanner = Scanner;
  mustache.Context = Context;
  mustache.Writer = Writer;

}));

/* Skill Engine*/
/* Global Variables */
//var $ = jQuery.noConflict();
/* extending */
function extend(ChildClass, ParentClass) {
    'use strict';
    ChildClass.prototype = new ParentClass();
    ChildClass.prototype.constructor = ChildClass;
}

/* SPE Constructor */
var SPE = function () {
    'use strict';
    return this;
};
/* Prototype */
SPE.prototype = {};
/* Defaults */
SPE.prototype.defaults = {
    data: {},
    source: '',
    template: '',
    type: ["functionals", "behavioural"],
    functionals: {
        name: 'functionals',
        title: '<i class="fa fa-minus-square"></i> Functional Skills',
        id: "panelFunSkill",
        selector: "section#sectionFunSkill",
        colorClass: "info",
        level: [
            'ramu','ajith', 'yuva', 'raja', 'obuli'
        ],
        isSearch: true,
        isLegend: false,
        isTour: false,
        skillLimit: 999
    },
    behavioural: {
        name: 'behavioural',
        title: '<i class="fa fa-plus-square"></i> Behavioural Skills',
        id: "panelBehSkill",
        selector: "section#sectionBehSkill",
        colorClass: "primary",
        level: ['k', 'a', 'v'],
        isSearch: false,
        isLegend: false,
        isTour: false,
        skillLimit: 99
    },
    managerial: {
        name: 'managerial',
        title: '<i class="fa fa-user"></i> Managerial Skills',
        id: "panelManSkill",
        selector: "section#sectionManSkill",
        colorClass: "danger",
        level: ['ka', 'vi'],
        isSearch: false,
        isLegend: false,
        isTour: false,
        skillLimit: 2
    },
    parent_id: 0,
    showSkillDeleteBtn: true
};
/******************************************************************************/
SPE.prototype.level = [
    'ramu','ajith', 'yuva', 'raja', 'obuli'
];
/******************************************************************************/
SPE.prototype.icons = {
    spinner: '<i class="fa fa-spinner fa-pulse fa-lg pull-right skillLoading"></i>',
    angle_double_right: '<i class="fa fa-angle-double-right pull-right skillArrow"></i>',
    skill: {
        0: '<i class="fa fa-trophy text-success"></i> ',
        1: '<i class="fa fa-tree text-primary"></i> ',
        3: '<i class="fa fa-sun-o text-info"></i> ',
        4: '<i class="fa fa-pagelines text-warning"></i> '
    }
};
/******************************************************************************/
SPE.prototype.dataSetter = function () {

    if (!jQuery.isEmptyObject(this.options.data)) {

        var types = this.options.type,
            data = this.options.data,
            skills = storageWrap.getItem('skills');

        for (var i = 0, maxi = types.length; i < maxi; i++) {

            var type = types[i],
                typeData = data[types[i]] || [];


            if (!skills.hasOwnProperty(type)) {

                skills[type] = [];
            }

            for (var j = 0, maxj = typeData.length; j < maxj; j++) {

                storageWrap.setItem(typeData[j].id, typeData[j]);

                if (typeData[j].is_child != 1) {

                    skills[type].push(parseInt(typeData[j].id, 10));
                }
            }
        }

        storageWrap.setItem('skills', skills);
    }
}

/******************************************************************************/
SPE.prototype.skillSetter = function (type, selectedSkillID) {
    'use strict';
    var skills = storageWrap.getItem('skills'),
        skillData = storageWrap.getItem(selectedSkillID);


    if (!skills.hasOwnProperty(type)) {

        skills[type] = [];
    }

    if ($.inArray(selectedSkillID, skills[type]) === -1) {
        skillData["checked"] = true;
        skills[type].push(selectedSkillID);
    } else {
        skills[type] = $.grep(skills[type], function (value) {
            return value !== selectedSkillID;
        });
        
        skillData["checked"] = false;
    }

    storageWrap.setItem(selectedSkillID, skillData);
    storageWrap.setItem("skills", skills);
};
/******************************************************************************/
SPE.prototype.skillGetter = function (type) {
    'use strict';

    var skills = storageWrap.getItem('skills'),
        skillsTemp,
        skillsSwap,
        skillsDatum = [],
        i,
        k,
        maxi,
        maxk;

    if (!skills.hasOwnProperty(type)) {

        return [];
    }

    skillsTemp = skillsSwap = skills[type];

    for (k = 0, maxk = skillsSwap.length; k < maxk; k++) {

        var templateForm = $('form[data-id="' + skillsSwap[k] + '"]');
        if (templateForm.length === 1) {

            var templateSkill = {};
            $.extend(templateSkill, storageWrap.getItem(skillsSwap[k]), templateForm.serializeObject());

            storageWrap.setItem(skillsSwap[k], templateSkill);
        }

        skillsTemp = skillsTemp.concat(storageWrap.getItem(skillsSwap[k]).tree_ids.split(',').filter(Boolean));
    }

    skillsTemp = skillsTemp.unique();

    for (i = 0, maxi = skillsTemp.length; i < maxi; i++) {
        skillsDatum.push(storageWrap.getItem(skillsTemp[i]));
    }

    return skillsDatum;
};
/******************************************************************************/
SPE.prototype.skillPathSetter = function (type, id, level, levelNext) {

        var _skillPath = storageWrap.getItem('skillPath');

        if (!_skillPath.hasOwnProperty(type)) {

            _skillPath[type] = [];
        }

        _skillPath[type][level] = id;
        _skillPath[type].slice(0, levelNext);
        storageWrap.setItem('skillPath', _skillPath);

    }
    /******************************************************************************/
SPE.prototype.skilltree = function (self, options) {
    'use strict';
    var readymade = function ($data, $parent) {
        var i,
            $tree = '';
        if ($parent !== 0) {
            $tree += '<ul>';
        }
        for (i = 0; i < $data.length; i++) {

            if ($data[i].parent_id == $parent) {
                $tree += '<li data-id="' + $data[i].id + '" data-type="' + options.type + '" data-value="' + $data[i].value + '" ';
                if ($data[i].is_child == 1 || $data[i].is_child == 4) {
                    $tree += 'class="parent_li"';
                }
                $tree += ' >';
                switch (parseInt($data[i].is_child, 10)) {
                case 0:
                    $tree += '<a class="skill-item-view" data-is_child="' + $data[i].is_child + '">' + self.icons.skill[$data[i].is_child];
                    $tree += $data[i].value;
                    $tree += '</a>';
                    if ($data[i].desc !== null && $data[i].desc !== "null" && $data[i].desc != "undefined" && $data[i].desc !== '') {
                        $tree += '&nbsp;&nbsp;<abbr data-toggle="tooltip" data-placement="right" data-title="' + $data[i].desc + '" title="' + $data[i].desc + '" class="label label-default">?</abbr>';
                    }

                    if (self.options.showSkillDeleteBtn) {
                        $tree += '<a href="javascript:void(0);" class="skillDelete text-danger pull-right" data-id="' + $data[i].id + '" data-parent_id="' + $data[i].parent_id + '"  data-value="' + $data[i].value + '"  data-type="' + options.type + '" data-is_child="' + $data[i].is_child + '"><i class="fa fa-trash "></i></a>';
                    }

                    $tree += '<select class="previewskillselect" name="skills-rating[]" id="skillselect-' + $data[i].id + '" data-id="' + $data[i].id + '">';
                    $tree += self.scaleType($data[i].scale_type, parseInt($data[i].rating, 10));
                    $tree += '</select>';

                    if (options.template) {
                        $tree += '<form data-id="' + $data[i].id + '">';
                        $tree += Mustache.render(options.template, $data[i]);
                        $tree += '</form>';
                    }
                    break;
                case 1:
                    $tree += '<a class="skill-item-view" data-is_child="' + $data[i].is_child + '">' + self.icons.skill[$data[i].is_child] + $data[i].value + '</a>';
                    if ($data[i].desc !== null && $data[i].desc !== "null" && $data[i].desc != "undefined" && $data[i].desc !== '') {
                        $tree += '&nbsp;&nbsp;<abbr data-toggle="tooltip" data-placement="right" data-title="' + $data[i].desc + '" title="' + $data[i].desc + '" class="label label-default">?</abbr>';
                    }
                    break;
                case 3:
                    $tree += '<a class="skill-item-view" data-is_child="' + $data[i].is_child + '">' + self.icons.skill[$data[i].is_child] + $data[i].value + '</a>';
                    if ($data[i].desc !== null && $data[i].desc !== "null" && $data[i].desc != "undefined" && $data[i].desc !== '') {
                        $tree += '&nbsp;&nbsp;<abbr data-toggle="tooltip" data-placement="right" data-title="' + $data[i].desc + '" title="' + $data[i].desc + '" class="label label-default">?</abbr>';
                    }
                    if (self.options.showSkillDeleteBtn) {
                        $tree += '<a href="javascript:void(0);" class="skillDelete text-danger pull-right" data-id="' + $data[i].id + '" data-parent_id="' + $data[i].parent_id + '"  data-value="' + $data[i].value + '"  data-type="' + options.type + '" data-is_child="' + $data[i].is_child + '"><i class="fa fa-trash "></i></a>';
                    }
                    break;
                case 4:
                    $tree += '<a class="skill-item-view" data-is_child="' + $data[i].is_child + '">' + self.icons.skill[$data[i].is_child] + $data[i].value + '</a>';
                    if ($data[i].desc !== null && $data[i].desc !== "null" && $data[i].desc != "undefined" && $data[i].desc !== '') {
                        $tree += '&nbsp;&nbsp;<abbr data-toggle="tooltip" data-placement="right" data-title="' + $data[i].desc + '" title="' + $data[i].desc + '" class="label label-default">?</abbr>';
                    }
                                
                    if($data[i].checked){
                        
                        if (self.options.showSkillDeleteBtn) {
                            $tree += '<a href="javascript:void(0);" class="skillDelete text-danger pull-right" data-id="' + $data[i].id + '" data-parent_id="' + $data[i].parent_id + '"  data-value="' + $data[i].value + '"  data-type="' + options.type + '" data-is_child="' + $data[i].is_child + '"><i class="fa fa-trash "></i></a>';
                        }
                        
                        $tree += '<select class="previewskillselect"  name="skills-rating[]" id="skillselect-' + $data[i].id + '" data-id="' + $data[i].id + '">';
                        $tree += self.scaleType($data[i].scale_type, parseInt($data[i].rating, 10));
                        $tree += '</select>';
                        $tree += '<div class="clearfix"></div>';

                        if (options.template) {
                            $tree += '<form data-id="' + $data[i].id + '">';
                            $tree += Mustache.render(options.template, $data[i]);
                            $tree += '</form>';
                        }
                    }
                    break;
                default:
                    $tree = 'Out of Child';
                }
                $tree += readymade($data, parseInt($data[i].id, 10));
                $tree += '<div class="clearfix"></div>';
                $tree += '</li>';
            }
        }
        if ($parent !== 0) {
            $tree += '</ul>';
        }
        return $tree;
    };
    return '<ul class="iys-tree">' + readymade(options.data, self.defaults.parent_id) + '</ul>';
};
/******************************************************************************/
SPE.prototype.barrating = {
    edit: function (self) {
        $('.previewskillselect').barrating("show", {
            theme: 'bootstrap-stars',
            showValues: false,
            showSelectedRating: true,
            wrapperClass: 'skillRatingView',
            onSelect: function (value, text) {

                if (value == "") {

                    value = 0;
                }

                var element = $(this).closest('li');
                self.skillRateSetter(element.data('id'), element.data('type'), value);
            }
        });
    }
};
/******************************************************************************/
SPE.prototype.skillRateSetter = function (id, type, rating) {
    var _skillJson = storageWrap.getItem(id);
    _skillJson.rating = parseInt(rating, 10);
    storageWrap.setItem(id, _skillJson);
};
/******************************************************************************/
SPE.prototype.scaleType = function (type, rate) {
    var scale_type = [{
        "id": "1",
        "scale": "Novice:Competent:Proficient:Expert:Master"
    }, {
        "id": "2",
        "scale": "0 - 2 yrs exp:2 - 5 yrs exp:5 - 10 yrs exp:10 - 20 yrs exp: 20 plus yrs exp"
    }, {
        "id": "4",
        "scale": "Fair:Good:Very Good:Excellent:Outstanding"
    }, {
        "id": "5",
        "scale": "1 - 5:6 - 10:11 - 50:51 - 200:&gt;200"
    }, {
        "id": "6",
        "scale": "Low:Medium:High:Very High:Extreme"
    }, {
        "id": "7",
        "scale": "&lt;10:10 - 50:50 - 100:100 - 200:&gt;200"
    }, {
        "id": "8",
        "scale": "&lt; 1 Mn:1 - 2 Mn:2 - 5 Mn:5 - 10 Mn:&gt; 10 Mn"
    }, {
        "id": "9",
        "scale": "Experience in compliance:Experience in making improvements:Experience in driving implementation:Experience in making changes:Experience in conceptualising and strategising"
    }, {
        "id": "10",
        "scale": "Mostly compliance:Made improvements:Led small scale implementation:Led large scale implementation:Conceptualised \/ Strategised"
    }, {
        "id": "11",
        "scale": "Compliance:Improvement:Implementation Team:Implementation Head:Strategy"
    }, {
        "id": "12",
        "scale": "Operational Level:Junior Mgmt:Middle Mgmt:Senior Mgmt:CXO Level"
    }, {
        "id": "13",
        "scale": "Making Improvements:Adding Features:Involved in NPD:Driving NPD:Strategy for NPD"
    }, {
        "id": "14",
        "scale": "&lt; 1 Month:1-3 Months:3-12 Months:1-2 Years:&gt;2 Years"
    }, {
        "id": "15",
        "scale": "Level 1:Level 2:Level 3:Level 4:Level 5"
    }, {
        "id": "16",
        "scale": "Disinterested and No capabilities:Can Manage Though Disinterested:Indifferent And Can Manage:Likes And Can Do Well:Strong Liking And Can Excel"
    }];
    var scale_split;
    scale_split = $.grep(scale_type, function (value) {

        return value.id == type;
    })[0].scale.split(':');
    var scale = '<option value=""></option>';
    $.each(scale_split, function (index, value) {
        if (rate === index + 1) {
            scale += '<option value="' + (index + 1) + '" selected="selected">' + value + '</option>';
        } else {
            scale += '<option value="' + (index + 1) + '">' + value + '</option>';
        }
    });
    return scale;
};
/******************************************************************************/
SPE.prototype.output = function () {

        var json = {},
            types = this.options.type;

        for (i = 0; i < types.length; i++) {

            json[types[i]] = this.skillGetter(types[i]);

        }

        return json;
    }
    /******************************************************************************/
jQuery.fn.skillEngine = function (options) {
    localStorage.clear();
    storageWrap.setItem('intro', true);
    //    storageWrap.setItem('skillPath', {});
    storageWrap.setItem('Beh-PO', 0);
    storageWrap.getItem('skills') || storageWrap.setItem('skills', {});

    if (jQuery.browser.mobile && false) {
        var _this = this;

        $.getScript('//ajax.googleapis.com/ajax/libs/jquerymobile/1.4.5/jquery.mobile.min.js');

        $(document).on("mobileinit", function () {
            return new SPEmicro(_this, options);
        });
    } else {

        return new SPEmacro(this, options);
    }
};
var SPEmacro = function ($element, options) {

    /* Element */
    if (typeof $element != "undefined") {

        this.$element = $element;
    } else {

        this.$element = $('body');
    }

    /* Options */
    this.options = jQuery.extend({}, this.defaults, options);

    if (this.options.source.length == '') {

        $element.addClass('iys-spe');
        $element.html('<div class="text-center text-danger"><i class="fa fa-exclamation-triangle"></i> Please provide the JSON source </div>');

        return false;

    }

    this.dataSetter();
    this.css.element(this);
    this.manipulate.section(this);
    this.css.section(this);
    this.toggle(this);
    this.event(this);
    this.init(this);
};
/* Extending SPE & Macro */
extend(SPEmacro, SPE);
/******************************************************************************/
SPEmacro.prototype.html = {
    intro: function () {

        var html = '';
        html += '<section class="app-brief" id="sectionSkillIntro">';
        html += '<header class="header" data-stellar-background-ratio="0.5" >';
        html += '<div class="color-overlay">';
        html += '<div class="only-logo">';
        html += '<div class="navbar">';
        html += '<div class="navbar-header">';
        html += '<h2> Introducing API for skills</h2>';
        html += '</div>';
        html += '</div>';
        html += '</div>';
        html += '<div class="row home-contents">';
        html += '<div class="col-lg-offset-2 col-lg-4 col-md-4 col-sm-4">';
        html += '<div class="intro-section">';
        html += '<h3 class="intro">We make it easy to help you understand, engage and enhance your skills</h3>';
        html += '<h5>Get data from our vast expanding skills library</h5>';
        html += '<a href="javascript:void(0);" id="skillTour" class="btn btn-warning no-radius">Take Tour</a>';
        html += '<a href="javascript:void(0);" id="skillPick" data-visible="section#sectionSkillPick" spe-role="section-toggle" class="btn btn-success no-radius "> Create Skills Profile</a>';
        html += '</div>';
        html += '</div>';
        html += '<div class="col-md-6 col-sm-6 hidden-xs">';
//        html += '<div class="phone-image">';
//        html += '<img src="https://api.itsyourskills.com/skillEngineHori/src/images/2-iphone-right.png" class="img-responsive" alt="skills iphone view">';
//         html += '</div>';
        html += '</div>';
        html += '</div>';
        html += '</div>';
        html += '</header>';
        html += '</section>';
        return html;
    },
    pick: function (self) {

        var html = '',
                types = self.options.type,
                defaults = self.defaults;

        /* Section */
        html += '<section class="app-brief" id="sectionSkillPick">';

        /* Header */
        html += '<div class="spe-header">';
        //        html += '<div class="col-md-3"><a href="javascript:void(0);" data-visible="section#sectionSkillIntro" spe-role="section-toggle" id="skillIntroBtn"  class="pull-left btn btn-info"><i class="fa fa-arrow-left  faa-horizontal animated"></i> Intro</a></div>';
        html += '<h4 class="skl-tit"><strong>Skills Library </strong><small>Pick skills for your profile</small></h4>';
        html += '<a href="javascript:void(0);" data-visible="section#sectionSkillEdit" spe-role="section-toggle" id="skillPreviewBtn"  class="pull-right btn btn-primary">Preview Skill Profile <i class="fa fa-arrow-right faa-horizontal animated"></i> </a>';
        html += '<div class="clearfix"></div>';
        html += '</div>';

        /* Body */
        html += '<div class="spe-body panel-group" id="accordionPick" role="tablist" aria-multiselectable="true">';

        for (k = 0, maxk = types.length; k < maxk; k++) {

            var properties = defaults[types[k]];

            html += '<div id="' + properties.id + '" class="spe-panel panel panel-' + properties.colorClass + '">';

            /* Panel Head */
            if (!properties.isSearch) {

//                html += '<div class="panel-heading" role="tab" class="func-title" data-toggle="collapse" data-parent="#accordionPick" data-target="#pick-collapse-' + properties.name + '" aria-expanded="true" aria-controls="pick-collapse-' + properties.name + '">';
//                html += '<h4 class="panel-title col-md-3">';

                html += '<div class="panel-heading" role="tab" >';
                html += '<h4 class="panel-title pull-left">';
                html += '<a role="button" class="func-title" data-toggle="collapse" data-parent="#accordionPick" data-target="#pick-collapse-' + properties.name + '" aria-expanded="true" aria-controls="pick-collapse-' + properties.name + '">';
                html += properties.title;
                html += '</a>';
                html += '</h4>';

            }

            if (properties.isSearch) {

                html += '<div class="panel-heading" role="tab" >';
                html += '<h4 class="panel-title pull-left">';
                html += '<a role="button" class="func-title" data-toggle="collapse" data-parent="#accordionPick" data-target="#pick-collapse-' + properties.name + '" aria-expanded="true" aria-controls="pick-collapse-' + properties.name + '">';
                html += properties.title;
                html += '</a>';
                html += '</h4>';

                html += '<div class="col-md-6 col-md-offset-2" style="display:inline-block"> ';
                html += '<select class="skillSearch" style="width:100%;margin-left:100px;"/>';
                html += '</div>';
            }

            if (properties.isLegend) {

                html += '<ul class = "tips-btn pull-right" >';
                html += '<li> <a class = "round green"> <i class="fa fa-tree"></i></a></li>';
                html += '<li> <a class = "round green-i"> <i class="fa fa-trophy"></i></a></li>';
                html += '<li> <a class = "round red"> <i class="fa fa fa-pagelines"></i></a></li>';
                html += '<li> <a class = "round yellow" > <i class="fa fa fa-sun-o"></i></a></li>';
                html += '</ul>';
            }

            if (properties.isTour) {

                html += '<div class="col-md-1"> ';
                html += '<a href="javascript:void(0);" id="skillTours" class="skillTour"><i class="fa fa-bell faa-ring animated"></i> Help</a>';
                html += '</div>';
            }

            html += '<div class="clearfix"></div>';
            html += '</div>';

            /* Panel Body */
            html += '<div id="pick-collapse-' + properties.name + '" class="panel-collapse collapse ' + (k == 0 ? "in" : "") + '" role="tabpanel">';
            for (i = 0; i < properties.level.length; i++) {

                /* Level */
                html += '<div id="' + properties.level[i] + '" data-level="' + i + '" data-type="' + properties.name + '" class="level">';

                /* Level Settings */
                html += '<div class="levelSettings level-header" data-level="' + i + '">';

                /* Sorting */
                html += '<div class="btn-group-justified btn-group text-warning">';
                html += '<a href="javascript:void(0);" role="button" class="skillSort btn btn-sm disabled"><i class="fa fa-sort"></i></a>';
                html += '<a href="javascript:void(0);" role="button" class="skillSortAsc btn btn-sm "><i class="fa fa-sort-alpha-asc"></i></a>';
                html += '<a href="javascript:void(0);" role="button" class="skillSortDesc btn btn-sm "><i class="fa fa-sort-alpha-desc"></i></a>';

                if (i != 0) {

                    html += '<a href="javascript:void(0);" role="button" class="skillSortSkillType btn btn-sm "><i class="fa fa-filter"></i></a>';
                    html += '<a href="javascript:void(0);" role="button" class="spe-levelClose btn btn-sm" ><i class="fa fa-times"></i></a>';
                }

                html += '</div>';

                /* Serach */
                if (properties.isSearch) {

                    html += '<div class="skillSearch text-center">';
                    html += '<select class="skillSearch" style="width: 100%"/>';
                    html += '</div>';
                }

                html += '</div>';

                /* Level List */
                html += '<div class="levelList" data-type="' + properties.name + '"  data-level="' + i + '"></div>';
                html += '</div>';
            }

            html += '</div>';
            html += '</div>';
        }
        html += '</div>';

        /* Footer */
        //        html += '<div class="spe-footer">';
        //        html += '<div class="col-md-3"><a href="javascript:void(0);" data-visible="section#sectionSkillIntro" spe-role="section-toggle" id="skillIntroBtn"  class="pull-left btn btn-info"><i class="fa fa-arrow-left  faa-horizontal animated"></i> Intro</a></div>';
        //        html += '<div class="col-md-6 text-center"></div>';
        //        html += '<div class="col-md-3"><a href="javascript:void(0);" data-visible="section#sectionSkillEdit" spe-role="section-toggle" id="skillPreviewBtn"  class="pull-right btn btn-info">Preview Skill Profile <i class="fa fa-arrow-right faa-horizontal animated"></i> </a></div>';
        //        html += '<div class="clearfix"></div>';
        //        html += '</div>';

        html += '</section>';
        return html;
    },
    edit: function (self) {

        var types = self.options.type,
                defaults = self.defaults,
                html = '';

        html += '<section class="app-brief" id="sectionSkillEdit">';
        html += '<div class="spe-header">';
        html += '<div class="col-md-3"><a href="javascript:void(0);" data-visible="section#sectionSkillPick" spe-role="section-toggle" id="spe-skillPickBtn" class="pull-left btn btn-primary"><i class="fa fa-eyedropper faa-tada animated"></i> Pick skills</a></div>';
        html += '<div class="col-md-6 text-center"><h4><strong>Skills Profile </strong><small>Preview of picked skills</small></h4></div>';
        //        html += '<div class="col-md-3"><a href="javascript:void(0);" data-visible="section#sectionSkillEdit" spe-role="section-toggle" id="spe-skillSaveBtn" class="pull-right btn btn-success"><i class="fa fa-floppy-o faa-burst animated"></i> Save</a></div>';
        html += '<div class="clearfix"></div>';
        html += '</div>';

        html += '<div class="spe-body  panel-group" id="skillEdit" role="tablist" aria-multiselectable="true">';
        for (i = 0, maxi = types.length; i < maxi; i++) {

            html += '<div class="spe-panel panel panel-' + defaults[types[i]].colorClass + '">';
            html += '<div class="panel-heading" role="tab" >';
            html += '<h4 class="panel-title">';
            html += '<a role="button" class="func-title" data-toggle="collapse" data-parent="#skillEdit" href="#collapse-' + defaults[types[i]].name + '" aria-expanded="true" aria-controls="collapse-' + defaults[types[i]].name + '">';
            html += defaults[types[i]].title;
            html += '</a>';
            html += '</h4>';
            html += '</div>';
            html += '<div id="collapse-' + defaults[types[i]].name + '" class="panel-collapse collapse ' + (i == 0 ? "in" : "") + '" role="tabpanel">';
            html += '<div class="panel-body">';
            html += '</div>';
            html += '</div>';
            html += '</div>';
        }
        html += '</div>';

        /* Footer */
        //        html += '<div class="spe-footer">';
        //        html += '<div class="col-md-3"><a href="javascript:void(0);" data-visible="section#sectionSkillPick" spe-role="section-toggle" id="spe-skillPickBtn" class="pull-left btn btn-info"><i class="fa fa-eyedropper faa-tada animated"></i> Pick skills</a></div>';
        //        html += '<div class="col-md-6 text-center"></div>';
        //        html += '<div class="col-md-3"><a href="javascript:void(0);" data-visible="section#sectionSkillEdit" spe-role="section-toggle" id="spe-skillSaveBtn" class="pull-right btn btn-success"><i class="fa fa-floppy-o faa-burst animated"></i> Save</a></div>';
        //        html += '<div class="clearfix"></div>';
        //        html += '</div>';

        html += '</section>';
        return html;
    },
    foot: function () {

        var html = '<footer>';
        html += '<p class="copyright">';
        html += '© 2015 It\'s Your Skills, All Rights Reserved';
        html += '</p>';
        html += '</footer>';
        return html;
    },
    util:function(){
        
         var html = '';
        html += '<section class="app-brief" id="sectionSkillUtil">';
        html += '</section>';
        return html;
    },
    uadd:function(term){
        
        var html = '';
        
        html += '<div class="spe-header">';        
        html += '<div class="col-md-6 col-md-offset-3 text-center"><h4>Add skill after verifiying</div>';
        html += '<div class="clearfix"></div>';
        html += '</div>';

        html += '<div class="spe-body col-lg-offset-3 col-md-6">';
        
        html += '<div class="panel panel-warning">';
        html += '<div class="panel-heading">';
        html += '<h4 class="panel-title">';
        html += 'Add ' + term;
        html += '</h4>';
        html += '</div>';
        html += '<div class="panel-body text-center">';
        html += '<div id="iysCaptchaMsg"></div>';
        html += '<div class="g-recaptcha" data-sitekey="6LeFDAMTAAAAAO06bx_YKqu35WIvwlGOqHnIpQQP"></div>';
        html += '</div>';
        html += '<div class="panel-footer">';
        html += '<a href="javascript:void(0);" data-visible="section#sectionSkillPick" spe-role="section-toggle" id="spe-skillPickBtn" class="pull-left btn btn-primary"><i class="fa fa-eyedropper faa-tada animated"></i> Pick skills</a>';
        html += '<button type="button" id="iysVerifyCaptchaBtn" class="btn btn-primary pull-right" data-term="' + term + '"><i class="fa fa-plus"></i> Add</button>';
        html += '<div class="clearfix"></div>';
        html += '</div>';
        html += '</div>';
        
        html += '</div>';
        
//        $captchaModal = '<div class="iys-spe">';
//        $captchaModal += '<div class="modal fade" id="userskillModal" data-backdrop="false" tabindex="-1" role="dialog" aria-labelledby="userskillModalLabel" aria-hidden="true">';
//        $captchaModal += '<div class="modal-dialog modal-md">';
//        $captchaModal += '<div class="modal-content">';
//        $captchaModal += '<div class="modal-header">';
//        $captchaModal += '<button type="button" class="close closeIysModal" aria-label="Close"><span aria-hidden="true">&times;</span></button>';
//        $captchaModal += '<h4 class="modal-title" id="userskillModalLabel">Add ' + term + '</h4>';
//        $captchaModal += '</div>';
//        $captchaModal += '<div class="modal-body text-center">';
//        $captchaModal += '<div id="iysCaptchaMsg"></div>';
//        $captchaModal += '<div class="g-recaptcha" data-sitekey="6LeFDAMTAAAAAO06bx_YKqu35WIvwlGOqHnIpQQP"></div>';
//        $captchaModal += '</div>';
//        $captchaModal += '<div class="modal-footer">';
//        $captchaModal += '<button type="button" class="btn btn-default closeIysModal">Close</button>';
//        $captchaModal += '<button type="button" id="iysVerifyCaptchaBtn" class="btn btn-primary" data-term="' + term + '"><i class="fa fa-plus"></i> Add</button>';
//        $captchaModal += '</div>';
//        $captchaModal += '</div>';
//        $captchaModal += '</div>';
//        $captchaModal += '</div>';
//        $captchaModal += '</div>';
        
        return html;
    }
};
/******************************************************************************/
SPEmacro.prototype.css = {
    element: function (self) {

        var $element = self.$element,
                height = ($element.innerHeight() < 300) ? $(window).innerHeight() : $element.innerHeight(),
                width = ($element.innerWidth() < 300) ? $(window).innerWidth() : $element.innerWidth();

        //        $('body').addClass('iys-spe');
        $element.addClass('iys-spe').css({
            height: height,
            width: width
        });
    },
    section: function (self) {

        var $element = self.$element,
                $section = $('section.app-brief'),
                $level = $('div.level'),
                $levelSettings = $('div.levelSettings'),
                $levelList = $('div.levelList'),
                $speHead = $('section.app-brief div.spe-header'),
                $speBody = $('section.app-brief div.spe-body'),
                $spePanelHead = $('section.app-brief div.spe-body div.panel-heading'),
                $spePanelBody = $('section.app-brief div.spe-body div.panel-body'),
                $speFoot = $('section.app-brief div.spe-footer');


        $section.css({
            width: $element.innerWidth(),
            height: $element.innerHeight()
        });

        $speBody.css({
            width: $section.innerWidth(),
            height: $section.innerHeight() - $speHead.outerHeight(true) - $speFoot.outerHeight(true) - 20
        });

        $spePanelBody.css({
            height: $speBody.innerHeight() - ($spePanelHead.outerHeight(true) * self.options.type.length) + 18
        });

        $level.css({
            height: $speBody.innerHeight() - ($spePanelHead.outerHeight(true) * self.options.type.length) - 24
        });

        $levelList.css({
            height: $level.innerHeight() - $levelSettings.outerHeight(true) // 34 is height of Level Settings
        });

        $.each(self.options.type, function (index, type) {

            var defaults = self.defaults[type],
                    levelCount = defaults.level.length,
                    allLevelWidth = $level.outerWidth(true) * levelCount;

            if (allLevelWidth > $speBody.innerWidth()) {

                spotMin = (allLevelWidth - $speBody.innerWidth()) / (levelCount - 1);

                $('#' + defaults.id + ' div.level').slice(1).css({
                    marginLeft: -Math.abs(spotMin)
                });

            } else {

                spotMax = (allLevelWidth - $speBody.innerWidth()) / levelCount;
                $('#' + defaults.id + ' div.level').css({
                    width: $level.outerWidth() + Math.abs(spotMax) - 1.65 // 1.65 is adjustment to set width fullscreen
                });
            }
        });
    }
};
/******************************************************************************/
SPEmacro.prototype.init = function (self) {

    var skills = storageWrap.getItem('skills');

    self.plugin.mCustomScroll();

    Mustache.tags = ["<%", "%>"];

//    $(document).tooltip({
//        selector: 'div.br-widget a',
//        placement: 'top',
//        title: function () {
//
//            return $(this).attr('data-rating-text');
//        }
//    });

    $.each(self.options.type, function (index, type) {

        self.fetch.skill(self, 0, type, 0);

        if (self.defaults[type].isSearch) {

            self.plugin.select22(self);
            self.plugin.select2(self, $('#' + self.defaults[type].id + ' div[data-level="0"]'));
        }

        $('div[data-level="0"]').show();
    });

    if (!$.isEmptyObject(skills) && $.isEmptyObject(self.options.data)) {

        swal({
            title: "Info",
            text: "Wanna load previous skills profile",
            type: "warning",
            showCancelButton: true,
            confirmButtonColor: "#DD6B55",
            confirmButtonText: "Yes, load it!",
            cancelButtonText: "No, start from strach!",
            closeOnConfirm: true,
            closeOnCancel: true
        },
        function (isConfirm) {
            if (isConfirm) {

                $('a#skillPreviewBtn').trigger('click');
            } else {

                for (i = 0; max = skills.length, i < max; i++) {

                    storageWrap.removeItem('tree:' + skills[i]);
                }
                storageWrap.setItem('skills', {});
            }
        });

    } else if (!$.isEmptyObject(skills) && !$.isEmptyObject(self.options.data)) {

        $('a#skillPreviewBtn').trigger('click');
    }

};
/******************************************************************************/
SPEmacro.prototype.toggle = function (self) {

    var intro = storageWrap.getItem("intro");

    $('div.level').hide();

    if (intro === null) {

        $('section#sectionSkillPick, section#sectionSkillEdit, section#sectionSkillUtil').hide();
        $('section#sectionSkillIntro').show();
    } else {

        $('section#sectionSkillIntro, section#sectionSkillEdit, section#sectionSkillUtil').hide();
        $('section#sectionSkillPick').show();
    }
};
/******************************************************************************/
SPEmacro.prototype.manipulate = {
    section: function (self) {

        var html = self.html.intro();

        //        $.each(self.options.type, function (index, type) {
        //
        //            html += self.html.pick(self.defaults[type]);
        //        });
        
        html += self.html.util();
        html += self.html.pick(self);
        html += self.html.edit(self);
        
        self.$element.append(html);
    },
    skill: function (self, data, id, type, level) {
        
        var trunc = 35;
        
        var skillItemGroup = $('div.list-group[data-type="' + type + '"][data-parent_id="' + id + '"]');

        if (skillItemGroup.length == 0) {

            var skillItemGroupHtml = '<div data-type="' + type + '" data-parent_id="' + id + '" class="list-group skills-group"></div>';
            $('#' + self.defaults[type].id + ' div.level[data-type="' + type + '"][data-level="' + level + '"] div.levelList .mCSB_container').append(skillItemGroupHtml);
        }

        var skills = storageWrap.getItem('skills'),
                skillItemHtml = '';

        if (typeof data.length != "undefined") {

            for (i = 0; i < data.length; i++) {

                if ($('a.skillItem[data-id="' + data[i].id + '"]').length == 0) {

                    if (jQuery.inArray(parseInt(data[i].is_child), [0, 4]) > -1) {

                        data[i].rating = 0;
                    }

                    if (jQuery.inArray(parseInt(data[i].is_child), [0, 3, 4]) > -1) {

                        data[i].checked = false;
                    }

                    data[i].type = type;

                    storageWrap.setItem(data[i].id, data[i]);
                    skillItemHtml += '<a class="skillItem list-group-item" title="'+data[i].value+'" data-level="' + level + '" data-type="' + type + '" data-id="' + data[i].id + '" data-parent_id="' + data[i].parent_id + '" data-value="' + data[i].value + '" data-is_child="' + data[i].is_child + '" data-scale_type="' + data[i].scale_type + '"  data-display_order="' + data[i].display_order + '" data-desc="' + data[i].desc + '"  data-tree_ids="' + data[i].tree_ids + '" href="javascript:void(0);">';
                                        
                    if($.inArray(parseInt(data[i].id), skills[type]) > -1){
                        
                        skillItemHtml += '<i class="fa fa-check"></i> ';
                    }
                    
                    skillItemHtml += self.icons.skill[data[i].is_child];
                    skillItemHtml += data[i].value.trunc(trunc, true);

                    if (typeof data[i].desc == 'string' && data[i].desc !== "") {

                        skillItemHtml += ' <i class="fa fa-exclamation-circle"  title="' + data[i].desc + '"></i>';
                    }

                    skillItemHtml += '</a>';
                }
                
            }
        } else if (data.length == 0) {

            skillItemHtml += '<div class="vertical-center text-center text-danger">No Skills Associated</div>';

        } else {

            if ($('a.skillItem[data-id="' + data.id + '"]').length == 0) {

                if (jQuery.inArray(parseInt(data.is_child), [0, 4]) > -1) {

                    data.rating = 0;
                }

                if (jQuery.inArray(parseInt(data.is_child), [0, 3, 4]) > -1) {

                    data.checked = false;
                }

                data.type = type;

                storageWrap.setItem(data.id, data);
                skillItemHtml += '<a class="skillItem list-group-item" title="'+data.value+'" data-level="' + level + '" data-type="' + type + '" data-id="' + data.id + '" data-parent_id="' + data.parent_id + '" data-value="' + data.value + '" data-is_child="' + data.is_child + '" data-scale_type="' + data.scale_type + '"  data-display_order="' + data.display_order + '" data-desc="' + data.desc + '" data-tree_ids="' + data.tree_ids + '"  href="javascript:void(0);">';
                skillItemHtml += self.icons.skill[data.is_child];
                skillItemHtml += data.value.trunc(trunc, true);

                if (typeof data.desc == 'string' && data.desc !== "") {

                    skillItemHtml += ' <i class="fa fa-exclamation-circle" title="' + data.desc + '"></i>';
                }

                skillItemHtml += '</a>';
            }
        }

        $('div.list-group[data-type="' + type + '"][data-parent_id="' + id + '"]').append(skillItemHtml);
    },
};
/******************************************************************************/
SPEmacro.prototype.fetch = {
    skill: function (self, id, type, level) {

        var loader = $('<div class="text-center text-info"><i class="fa fa-3x fa-circle-o faa-burst animated"></i></div>'),
                levelDiv = $('.levelList[data-type="' + type + '"][data-level="' + level + '"]  .mCSB_container');
        levelDiv.append(loader);

        $.ajax({
            url: self.options.source,
            type: 'POST',
            data: {
                id: id,
                type: type
            },
            datatype: 'json',
            timeout: 500,
            async: false,
            success: function (data, status, request) {

                loader.remove();

                if (!request.getResponseHeader("X-SPP-Formalities")) {
                    self.manipulate.skill(self, data, id, type, level);
                }
                else {
                    swal({
                        title: "Warning",
                        text: data.msg,
                        confirmButtonColor: "#DD6B55",
                    });
                }
            },
            error: function (request, status, error) {

                if (status == "timeout") {

                    $.ajax(this);
                }

            },
        });
    },
};
/******************************************************************************/
SPEmacro.prototype.event = function (self) {

    return self.$element.each(function (index, element) {

        var elementObj = jQuery(element);

        /* Traversing */
        elementObj.on({
            click: function (event) {

                var _this = $(this),
                        _data = event.target.dataset,
                        _level = parseInt(_data.level);
                        _levelNext = parseInt(_data.level) + 1,
                        _levelDiv = $('div#' + self.defaults[_data.type].level[_levelNext]),
                        _itemGroup = _levelDiv.find('div[data-parent_id=\'' + _data.id + '\']:first');
                
                /* Handling .active */
                _this.siblings('a.list-group-item').removeClass('active');
                $('a.list-group-item:hidden').removeClass('active');
                _this.addClass("active");

                /* Togging  */
                for (var i = _levelNext, max = self.defaults[_data.type].level.length; i < max; i++) {

                    $('.level[data-type="' + _data.type + '"]:eq(' + i + ')').hide();
                    $('.level[data-type="' + _data.type + '"]:eq(' + i + ') div.list-group').hide();
                }

                _levelDiv.show();

                if (_this.data("fetch") != 1) {

                    self.fetch.skill(self, _data.id, _data.type, _levelNext);
                    _this.attr("data-fetch", 1);
                }

                _itemGroup.show();

                //                self.skillPathSetter(_data.type, _data.id, _level, _levelNext);
                self.plugin.select2(self, _levelDiv);
                //                                _levelDiv.find('a.skillSort').trigger('click');


                //Behavioural Personality Orientation

                if (_this.data('id') == 7897983 && storageWrap.getItem('Beh-PO') == 0) {

                    swal({
                        title: "Information",
                        text: "You can pick only 5 Personality Orientation skills",
                        confirmButtonColor: "#DD6B55",
                    });
                }

                //End of Behavioural Personality Orientation

                return true;
            }
        },
        'a.skillItem[data-is_child="1"], a.skillItem[data-is_child="4"]');

        /* Rating */
        elementObj.on({
            click: function (event) {

                var _$this = $(this),
                        $check = _$this.find('i.fa-check'),
                        behPo = storageWrap.getItem('Beh-PO');

                //Behavioural Personality Orientation
                if ($check.length == 0 && _$this.data('parent_id') == 7897983 && behPo < 5) {



                    storageWrap.setItem('Beh-PO', behPo + 1);
                } else if ($check.length != 0 && _$this.data('parent_id') == 7897983) {

                    storageWrap.setItem('Beh-PO', behPo - 1);
                }

                if ($check.length == 0 && _$this.data('parent_id') == 7897983 && behPo == 5) {

                    swal({
                        title: "Info",
                        text: "Already reached out max. limit of Personality Orientation skill",
                        confirmButtonColor: "#DD6B55",
                    });

                    return false;
                }
                // End of Behavioural Personality Orientation

                if ($check.length == 0) {

                    _$this.prepend('<i class="fa fa-check" /> ');
                } else {

                    $check.remove();
                }

                self.skillSetter(_$this.data('type'), parseInt(_$this.data('id')));
                //                self.plugin.barrating.pick(self, _$this);
            }
        },
        'a.skillItem[data-is_child="0"], a.skillItem[data-is_child="4"]');


        /* Concept */
        elementObj.on({
            click: function (event) {

                var _$this = $(this),
                        $check = _$this.find('i.fa-check');

                if ($check.length == 0) {

                    _$this.prepend('<i class="fa fa-check" /> ');
                } else {

                    $check.remove();
                }

                self.skillSetter(_$this.data('type'), parseInt(_$this.data('id')));
            }
        }, 'a.skillItem[data-is_child="3"]');


        elementObj.on({
            click: function (event) {

                $('section.app-brief').hide();
                $($(this).data('visible')).show();
            }
        }, 'a[spe-role="section-toggle"]');

        /* Tour */
        elementObj.on({
            click: function (event) {

                self.plugin.tour(self);
            }
        },
        'a#skillTour');

        /* Intro */
        elementObj.on({
            click: function (event) {

                storageWrap.setItem("intro", true);
            }
        },
        'a#skillPick');

        /* View */
        elementObj.on({
            click: function (event) {

                var types = self.options.type;

                for (i = 0, maxi = types.length; i < maxi; i++) {

                    var skillsDatum = self.skillGetter(types[i]);

                    if (skillsDatum.length > 0) {

                        options = {
                            data: skillsDatum,
                            type: types[i],
                            template: self.options.template
                        };
                        $('#collapse-' + types[i] + ' .mCSB_container').html(self.skilltree(self, options));
                        self.barrating.edit(self, this);
                    } else {

                        $('#collapse-' + types[i] + ' .mCSB_container').html('<div class="center-block text-center text-danger"><i class="fa fa-warning faa-flash animated"></i> Pick atleast one ' + types[i] + ' skills</div>');
                    }

                }

            }
        }, 'a#skillPreviewBtn');

        /* Trashing */
        elementObj.on({
            click: function (event) {

                var _this = $(this),
                        element = $('div[data-parent_id="' + _this.data('parent_id') + '"] > a[data-id="' + _this.data('id') + '"]');


                if (element.length) {

                    element.trigger('click');
                } else {

                    self.skillSetter(_this.data('type'), _this.data('id'));
                }

//                    if(parseInt(_this.data('is_child'),10) == 4){
//
//                        $(this).remove();
//
//                        alert('s');
//                    }

                $('a#skillPreviewBtn').trigger('click');
            }
        },
        'a.skillDelete');

        /* Sorting */
        elementObj.on({
            click: function (event) {

                var _this = $(this);
                var _level = _this.closest('div.level');
                var _levelSettings = _level.find('div.levelSettings');
                var _itemGroup = _level.find('div.list-group:visible');
                var _skillItem = _itemGroup.find('a.list-group-item');
                _skillItem.sort(function (a, b) {

                    var contentA = parseInt($(a).attr('data-display_order'));
                    var contentB = parseInt($(b).attr('data-display_order'));
                    return (contentA < contentB) ? -1 : (contentA > contentB) ? 1 : 0;
                });
                _skillItem.detach().appendTo(_itemGroup);
                _levelSettings.find('a.skillSortAsc, a.skillSortSkillType, a.skillSortDesc').removeClass("disabled");
                _this.addClass('disabled');
            }
        },
        'a.skillSort');
        /* Sorting Skill Type */
        elementObj.on({
            click: function (event) {

                var _this = $(this);
                var _level = _this.closest('div.level');
                var _levelSettings = _level.find('div.levelSettings');
                var _itemGroup = _level.find('div.list-group:visible');
                var _skillItem = _itemGroup.find('a.list-group-item');
                _skillItem.sort(function (a, b) {

                    var contentA = parseInt($(a).attr('data-is_child'));
                    var contentB = parseInt($(b).attr('data-is_child'));
                    return (contentA < contentB) ? -1 : (contentA > contentB) ? 1 : 0;
                });
                _skillItem.detach().appendTo(_itemGroup);
                _levelSettings.find('a.skillSort, a.skillSortAsc, a.skillSortDesc').removeClass("disabled");
                _this.addClass('disabled');
            }
        },
        'a.skillSortSkillType');
        /* Sort Ascending */
        elementObj.on({
            click: function (event) {

                var _this = $(this);
                var _level = _this.closest('div.level');
                var _levelSettings = _level.find('div.levelSettings');
                var _itemGroup = _level.find('div.list-group:visible');
                var _skillItem = _itemGroup.find('a.list-group-item');
                _skillItem.sort(function (a, b) {

                    var contentA = $(a).attr('data-value').toLowerCase();
                    var contentB = $(b).attr('data-value').toLowerCase();
                    return (contentA < contentB) ? -1 : (contentA > contentB) ? 1 : 0;
                });
                _skillItem.detach()
                        .
                        appendTo(_itemGroup);
                _levelSettings.find(
                        'a.skillSort, a.skillSortSkillType, a.skillSortDesc')
                        .
                        removeClass("disabled");
                _this.addClass('disabled');
            }
        },
        'a.skillSortAsc');
        /* Sort Descending */
        elementObj.on({
            click: function (event) {

                var _this = $(this);
                var _level = _this.closest('div.level');
                var _levelSettings = _level.find('div.levelSettings');
                var _itemGroup = _level.find('div.list-group:visible');
                var _skillItem = _itemGroup.find('a.list-group-item');
                _skillItem.sort(function (a, b) {

                    var contentA = $(a).attr('data-value').toLowerCase();
                    var contentB = $(b).attr('data-value').toLowerCase();
                    return (contentA > contentB) ? -1 : (contentA < contentB) ? 1 : 0;
                });
                _skillItem.detach().appendTo(_itemGroup);
                _levelSettings.find('a.skillSort, a.skillSortSkillType, a.skillSortAsc').removeClass("disabled");
                _this.addClass('disabled');
            }
        },
        'a.skillSortDesc');


        /* Level Close */
        elementObj.on({
            click: function (event) {

                var i = 1,
                        $this = $(this),
                        $level = $this.closest('div.level');

                i = $level.attr("data-level");
                type = $level.attr("data-type");

                for (i; i <= self.level.length; i++) {

                    $('#' + self.defaults[type].level[i]).hide();
                }
            }
        },
        'a.spe-levelClose');

        /* Locating from view */
        elementObj.on({
            click: function (event) {

                var $li = $(this).parents('li');

                $('a#spe-skillPickBtn').trigger('click');

//                $('#' + self.defaults[$li[0].dataset.type].id).collapse('show');                

                for (var i = $li.length - 1, maxi = 0; i >= maxi; i--) {
                    
                    var skillLocate = storageWrap.getItem($li[i].dataset.id);

                    $('a.skillItem[data-id="' + $li[i].dataset.id + '"]').trigger('click');
                                        
                    if(skillLocate.is_child != 1){
                        
                        $('a.skillItem[data-id="' + $li[i].dataset.id + '"]').trigger('click');
                    }
                }

            }
        }, 'a.skill-item-view');
        
        
         /* Locating from view */
        $(document).on({
            click: function () {
                
                var term = $('input.select2-search__field').val();             
                $('#sectionSkillUtil').html(self.html.uadd(term));
               
                $(document).find('select.skillSearch').select2('close');
                
                $('section#sectionSkillUtil').show();
                $('section#sectionSkillPick').hide();
               
               $.getScript('https://www.google.com/recaptcha/api.js');
               
                $(document).off('click', '#iysVerifyCaptchaBtn');
                $(document).on('click', '#iysVerifyCaptchaBtn', function () {

                    if ($('#g-recaptcha-response').val() == '') {

                        $('#iysCaptchaMsg').html('<div class="alert alert-danger text-center" role="alert"><i class="fa fa-exclamation-triangle"></i> Please verify the Captcha</div>');
                        return false;
                    }

                    $.ajax({
                        url: 'https://www.itsyourskills.com/proxy/verify-captcha/' + $('#g-recaptcha-response').val(),
                        type: 'POST',
                        async: true,
                        success: function ($da) {

                            if ($da.success) {

                                $.ajax({
                                    url: 'https://www.itsyourskills.com/proxy/action',
                                    type: 'POST',
                                    data: {
                                        'action': 'add',
                                        'term': $('#iysVerifyCaptchaBtn').data('term')
                                    },
                                    success: function ($data) {

                                        $data = JSON.parse($data);
                                        $datum = JSON.parse($data[0].tree_structure);
                                        
                                         self.options.data = {
                                            "functionals": $datum
                                        };
                                        self.dataSetter();
                                        $('a#skillPreviewBtn').trigger('click');

//                                        $.fn.skillEngine.buildTree($datum, 0, 'functionals', $options, 'SEARCH');

                                        $('#iysVerifyCaptchaBtn').remove();
                                        $('#iysCaptchaMsg').html('<div class="alert alert-success text-center" role="alert"><i class="fa fa-check-circle"></i> Added new skill successfully</div>');
                                    }
                                });
                            }
                            else {

                                $('#iysCaptchaMsg').html('<div class="alert alert-danger text-center" role="alert"><i class="fa fa-exclamation-triangle"></i> Failed to add new skill. Try again</div>');
                            }
                        }
                    });
                });

            }
        }, 'a.spe-addUserSkill');
        
        elementObj.on({
            
            "hide.bs.collapse":function(e){
                
                void 0;
                
                $(e.target).prev('.panel-heading')
                    .find("i.fa")
                    .toggleClass('fa-plus-square fa-minus-square');
            },
            "show.bs.collapse":function(e){
                
                 $(e.target).prev('.panel-heading')
                    .find("i.fa")
                    .toggleClass('fa-plus-square fa-minus-square');
            }
        }, '#accordionPick, #skillEdit');

        elementObj.on({
            mouseenter: function () {   

                var $this = $(this),
                        _curLevel = $this.data('level'),
                        _type = $this.data('type'),
                        _maxLevel = self.defaults[_type].level.length,
                        _zindex = 998;

                for (var i = _curLevel; i < _maxLevel; i++) {

                    $('div.level[data-level="' + i + '"][data-type="' + _type + '"').css({
                        "z-index": _zindex
                    });

                    _zindex = _zindex - i;
                }
            },
            mouseleave: function () {

                var $this = $(this),
                        _type = $this.data('type');

                $('div.level[data-type="' + _type + '"').css({
                    "z-index": 100
                });
            }
        },
        'div.level');
    });
};
/******************************************************************************/
SPEmacro.prototype.plugin = {
    //    barrating: {
    //        pick: function (self, _this) {
    //
    //            /* Bar Rating */
    //            if (_this.find('div.skillRatingWrap').length == 0 && _this.find('select.skillRating').length == 0) {
    //
    //                var skillHtml = '';
    //                skillHtml += '<select class="skillRating">';
    //                skillHtml += self.scaleType(_this.data('scale_type'), parseInt(0, 10));
    //                skillHtml += '</select>';
    //                _this.append(skillHtml);
    //                $('select.skillRating').barrating('show', {
    //                    theme: 'css-stars',
    //                    initialRating: null,
    //                    showValues: false,
    //                    showSelectedRating: false,
    //                    wrapperClass: 'skillRatingWrap',
    //                    onSelect: function (value, text) {
    //
    //                        var element = _this;
    //                        if (value !== '') {
    ////                                    elemebarratingnt.trigger('click');
    //                        }
    //                        self.util.rateHandler(element.data('id'), element.data('type'), value);
    //                    }
    //                });
    //            }
    //
    //        }
    //    },
    mCustomScroll: function () {

        // Scroller
        $('div.levelList').mCustomScrollbar({
            theme: "minimal-dark",
            autoHideScrollbar: true,
            autoExpandScrollbar: false,
            scrollbarPosition: "inside",
        });

        $('#sectionSkillEdit .panel-body')
                .
                mCustomScrollbar({
                    theme: "dark",
                    autoHideScrollbar: true,
                    autoExpandScrollbar: true,
                    scrollbarPosition: "inside",
                    advanced: {
                        updateOnContentResize: true,
                        updateOnBrowserResize: true
                    },
                });
    },
    select2: function (self, _level) {

        var _levelSettings = _level.find('div.levelSettings');
        var _select = _levelSettings.find('select.skillSearch');
        var level = _level.data('level') - 1;
        var item = $('#' + self.defaults[_level.data('type')].level[level] + ' a.skillItem.active');
        var pid = (typeof item.data('id') == "undefined") ? 0 : item.data('id');
        var text = (typeof item.data('value') == "undefined") ? "Entire Level" : item.data('value');

        _select.select2({
            theme: "bootstrap",
            allowClear: true,
            placeholder: "Search " + text,
            ajax: {
                url: self.options.source,
                type: "POST",
                dataType: 'json',
                delay: 250,
                data: function (params) {
                    return {
                        approach: "search",
                        id: pid,
                        type: "functionals",
                        term: params.term,
                    };
                },
                processResults: function (data) {
                    var datum = [];
                    $.each(data, function (key, value) {
                        datum.push({
                            'id': value.tree_structure,
                            'text': value.value
                        });
                    });
                    return {
                        results: datum
                    };
                },
//                                cache: true
            },
            escapeMarkup: function (markup) {
                return markup;
            },
            "language": {
                "noResults": function(){

                    return "No Skills Found <a href='#' class='spe-addUserSkill btn btn-danger'>Add </a>";
                }
            },
            minimumInputLength: 3,
        }).on("change", function (e) {

            var data = self.util.buildHierarchy(JSON.parse($(this).val()));

            if (data != null) {

                for (var i = 0; max = data.length, i < max; i++) {

                    self.manipulate.skill(self, data[i], data[i].parent_id, data[i].type, level + 1 + i);
                }
                for (var i = 0; max = data.length, i < max; i++) {

                    $('a.skillItem[data-id="' + data[i].id + '"]').trigger('click');
                }
            }
        });
    },
    select22: function (self) {

        var _select = $('div#accordionPick div.panel-heading select.skillSearch'),
                pid = 0,
                type = "functionals",
                text = "Functional skills (e.g: php, furniture making, mussel fishing, trick photography ...)";

        function formatItem(item) {
           
            //            var tree = item.text.split('$$$');
            var treeArr = item.text.replace(/:\d+_/g, '@@@').split('@@@');
            var skillname = treeArr[0],
                    categories = [],
                    catstr = '';
            treeArr = treeArr.slice(3, treeArr.length);
            categories = treeArr;
            catstr = (categories.length > 0 ? ('<div><small class="iys-subcat">(' + categories.join(' <i class="fa fa-caret-left"></i> ').slice(0, -1) + ')</small></div>') : '');
            return '<div data-type="' + item.type + '"><div><b>' + skillname + '</b></div>' + catstr + '</div>';
        }

        function formatItemSelection(obj) {
            
            if(obj.id == ""){
                
                return obj.text;
            }
            else{
                
                return obj.text.split('@@@')[0];
            }
        }

        _select.select2({
            theme: "bootstrap",
            allowClear: true,
            placeholder: "Search " + text,
            ajax: {
                type: "POST",
                //                url: self.options.source,
                url: 'https://www.itsyourskills.com/proxy/action',
                dataType: 'json',
                delay: 250,
                data: function (params) {
                    return {
                        action: "search",
                        id: pid,
                        type: type,
                        term: params.term,
                    };
                },
                processResults: function (data) {
                    var datum = [],
                        template = {
                            'text': "Templates<hr/>",
                            'children': []
                        },
                        skill = {
                            'text': "Skills<hr/>",
                            'children': []
                        };
                    $.each(data, function (key, value) {

                        if (value.skill_type == 2) {

                            template.children.push({
                                'id': value.tree_structure + '$$$' + value.skill_type,
                                'text': value.value + '@@@' + value.tree_id_value
                            });
                        }

                        if (value.skill_type == 0 || value.skill_type == 1) {

                            skill.children.push({
                                'id': value.tree_structure + '$$$' + value.skill_type,
                                'text': value.value + '@@@' + value.tree_id_value
                            });
                        }

                    });

                    if (template.children.length) {
                        datum.push(template);
                    }

                    if (skill.children.length) {
                        datum.push(skill);
                    }

                    return {
                        results: datum
                    };
                },
                // cache: true
            },
            escapeMarkup: function (markup) {
                return markup;
            },
            minimumInputLength: 3,
            templateResult: formatItem,
            templateSelection: formatItemSelection,
            "language": {
                "noResults": function(){

                    return "No Skills Found <a href='#' class='spe-addUserSkill btn btn-danger'>Add </a>";
                }
            },
        }).on("change", function (e) {

            var _$this = $(this),
                    _value = _$this.val().split('$$$'),
                    data = self.util.buildHierarchy(JSON.parse(_value[0])),
                    _skill_type = _value[1];

            if (_skill_type == 0 || _skill_type == 1) {

                if (data != null) {

                    for (var i = 0; max = data.length, i < max; i++) {

                        self.manipulate.skill(self, data[i], data[i].parent_id, data[i].type, i);
                    }

                    for (var i = 0; max = data.length, i < max; i++) {

                        $('a.skillItem[data-id="' + data[i].id + '"]').trigger('click');
                    }
                }
            }

            if (_skill_type == 2) {

                self.options.data = {
                    "functionals": data
                };
                self.dataSetter();
                $('a#skillPreviewBtn').trigger('click');
            }
        });
    },
    tour: function (self) {

        var tour = new Tour({
            //            storage: window.sessionStorage,
            orphan: true,
            steps: [
                {
                    element: 'div#' + self.level[0],
                    title: '<i class="fa fa-level-up"></i> Level',
                    content: "...",
                    backdrop: true,
                },
                {
                    element: 'div#' + self.level[0] + ' div.levelSettings',
                    title: '<i class="fa fa-cogs"></i> Level Settings',
                    content: "...",
                    backdrop: true,
                },
                {
                    element: 'div#' + self.level[0] + ' div.levelSettings a.skillsdrop',
                    title: '<i class="fa fa-sort-desc"></i> Sorting Filter',
                    content: '<i class="fa fa-sort text-primary"></i> Default Sort <br/> <i class="fa fa-sort-alpha-asc text-info"></i> Ascending Sort <br/><i class="fa fa-sort-alpha-desc text-success"></i> Descending Sort <br/>',
                    animation: true,
                    placement: "bottom",
                },
                {
                    element: 'div#' + self.level[0] + ' div.skills-group a.skillItem:nth-child(5)',
                    title: self.icons.skill[1] + "Skill Category",
                    content: "...",
                    onNext: function () {

                        $('div#' + self.level[0] + ' div.skills-group a.skillItem:nth-child(5)').trigger('click');
                        $('div#' + self.level[1] + ' div.skills-group a.skillItem:nth-child(1)').trigger('click');
                        $('div#' + self.level[2] + ' div.skills-group a.skillItem:nth-child(4)').trigger('click');
                    }
                },
                {
                    element: 'div#' + self.level[3] +
                            ' div.skills-group a.skillItem:nth-child(1)',
                    title: self.icons.skill[4] + "Parent level Skill",
                    content: "...",
                    animation: true,
                    placement: "bottom",
                    delay: 2000,
                    onNext: function () {

                        $('div#' + self.level[3] + ' div.skills-group a.skillItem:nth-child(1)').trigger('click');
                    }
                },
                {
                    element: 'div#' + self.level[4] + ' div.skills-group a.skillItem:nth-child(3)',
                    title: self.icons.skill[3] + "Concept of Parent Skill",
                    content: "...",
                    animation: true,
                    delay: 1000,
                    onNext: function () {

                        $('div#' + self.level[2] + ' div.skills-group a.skillItem:nth-child(9)').trigger('click');
                    }
                },
                {
                    element: 'div#' + self.level[3] + ' div.skills-group a.skillItem:nth-child(3)',
                    title: self.icons.skill[3] + "Skill",
                    content: "...",
                    animation: true,
                },
            ]
        });
        tour.init();
        tour.start(true);
    }
};
/******************************************************************************/
SPEmacro.prototype.util = {
    buildHierarchy: function (data) {

        var vault = [];
        traverse = function (data, parent) {

            for (var i = 0,
                    max = data.length; i < max; i++) {

                if (data[i].parent_id == parent) {

                    vault.push(data[i]);
                    traverse(data, data[i].id);
                }
            }
        }

        if (data != null) {
            traverse(data, 0);
        }

        return vault;
    },
    rateHandler: function (id, type, rating) {

        var _skillJson = storageWrap.getItem(id);
        _skillJson.rating = parseInt(rating);
        storageWrap.setItem(id, _skillJson);
    }
};

var SPEmicro = function ($element, options) {

    this.$element = $element;
    this.options = options;

    this.css.element(this);
    this.manipulate.pages(this);
    this.init(this);
    this.event(this);
};

extend(SPEmicro, SPE);

/* CSS */
SPEmicro.prototype.css = {
    element: function (self) {

        self.$element.addClass('iys-spe');
    }
};

/* HTML */
SPEmicro.prototype.html = {
    intro: function () {

        var html = '';
        html += '<div data-role="page" id="spe-intro" class="spe-page spe-intro-page">';
        html += '<div role="main" class="ui-content">';
        html += '<h1>Introducing API for skills</h1>';
        html += '<p>The Skills API is used to get data from "It\'s Your Skills" skills library. It is a HTTP based API to retrieve the skills to be used by any HRIS application.</p>';
        html += '<a href="#skills-0" class="ui-btn ui-shadow ui-corner-all">Create Skills Profile</a>';
        html += '</div>';
        html += '</div>';
        return html;
    },
    view: function () {

        var html = '';
        html += '<div data-role="page" id="spe-view" class="spe-page spe-view-page">';
        html += '<div data-role="header" data-position="fixed">';
        html += '<a href="#" data-icon="back" data-iconpos="notext" data-role="button" data-rel="back" data-transition="flow" >Back</a>';
        html += '<h1>Preview of Skills Profile</h1>';
        html += '</div>';
        html += '<div data-role="main" id="spe-view-content" class="ui-content">';
        html += '</div>';
        html += '<div data-role="footer">';
        html += '</div>';
        html += '</div>';

        return html;
    },
    panel: function () {

        var html = '';
        html += '<div data-role="panel" data-position-fixed="true" id="spe-right-panel" data-position="right"></div>';
        html += '<div data-role="panel" data-position-fixed="true" data-theme="b" id="spe-left-panel" >';
        html += '<ul data-role="listview" id="spe-left-list"  data-theme="a"  data-inset="true">';
        html += '</ul>';
        html += '</div>';

        return html;
    }
};

/* Manipulate */
SPEmicro.prototype.manipulate = {
    pages: function (self) {

        $('head').
                append('<meta name="viewport" content="width=device-width, initial-scale=1.0">');

        self.$element.append(self.html.intro() + self.html.view());
        self.$element.pagecontainer();
        self.$element.append(self.html.panel());

        $('#spe-left-list').
                listview();
        $("#spe-left-panel,#spe-right-panel").
                panel({
                    animate: true,
                    display: 'reveal'
                });
    },
    skill: function (self, data, id, type, level, value) {

        var levelName = self.level[level + 1],
                skillItems = [],
                skillItemGroup = $('ul[data-id="' + id + '"]');

        if (skillItemGroup.length == 0) {

            var page,
                    header,
                    menuBtn,
                    headTitle,
                    content,
                    footer,
                    footBtn;

            page = $('<div data-role="page" id="skills-' + id + '" data-level="' + level + '" class="spe-page spe-skill-page ' + self.level[level] + '" />');
            header = $('<div data-role="header" data-position="fixed" />');
            menuBtn = $('<a href="#spe-left-panel" data-icon="bars" data-iconpos="notext" data-role="button">Menu</a>');
            headTitle = $('<h1>' + value + '</h1>');
            content = $('<div data-role="content" class="spe-skill-item ui-content" />');
            footer = $('<div data-role="footer" />');
            footBtn = $('<a href="#spe-view" class="ui-btn ui-btn-right ui-corner-all ui-shadow">I\'am done Preview</a>');
            skillItemGroup = $('<ul data-role="listview" data-level="' + level + '" data-id="' + id + '" data-filter="true" data-filter-placeholder="Search ' + (value ? value : 'Entire Level') + '" data-inset="true"/>');

            self.$element.append(page);
            header.append(menuBtn);
            header.append(headTitle);
            content.append(skillItemGroup);
            footer.append(footBtn);
            page.append(header);
            page.append(content);
            page.append(footer);
        }

        for (var i = 0,
                max = data.length; i < max; i++) {

            temp = '';
            if (data[i].is_child == 1 || data[i].is_child == 4) {

                temp += '<li><a data-transition="slide" href="#skills-' + data[i].parent_id + '"';
            } else {

                temp += '<li data-icon="false"><a href="javascript:void(0);"';
            }
            temp += ' data-level="' + level + '" data-type="' + type + '" data-id="' + data[i].id + '" data-parent_id="' + data[i].parent_id + '" data-value="' + data[i].value + '" data-is_child="' + data[i].is_child + '" data-scale_type="' + data[i].scale_type + '"  data-display_order="' + data[i].display_order + '"  class="spe-skill-item">';
            temp += self.icons.skill[data[i].is_child] + data[i].value + '</a></li>';
            skillItems.push(temp);

            storageWrap.setItem(data[i].id, data[i]);
        }

        skillItemGroup.append(skillItems.join(" "));
        skillItemGroup.listview();

    }
};

/* Initialize */
SPEmicro.prototype.init = function (self) {

    self.fetch.skill(self, 0, 'functionals', 0, 'Functional Skills');
};

/******************************************************************************/
SPEmicro.prototype.fetch = {
    skill: function (self, id, type, level, value) {

        $.ajax({
            url: self.options.source,
            type: 'POST',
            data: {
                id: id,
                type: type
            },
            datatype: 'json',
            timeout: 500,
            async: false,
            success: function (data, status, request) {

                self.manipulate.skill(self, data, id, type, level, value);
            },
            error: function (request, status, error) {

                if (status == "timeout") {

                    $.ajax(this);
                }

            },
        });
    },
};

/* Event */
SPEmicro.prototype.event = function (self) {

    return self.$element.each(function (index, element) {

        var elementObj = jQuery(element);

        elementObj.on({
            click: function (event) {

                var _$this = $(this),
                        _data = event.target.dataset,
                        _level = parseInt(_data.level),
                        _levelNext = parseInt(_data.level) + 1,
                        _skillPath = storageWrap.getItem('skillPath');

                if (_$this.data("fetch") != 1) {

                    self.fetch.skill(self, _data.id, _data.type, _levelNext, _data.value);
                    _$this.attr("data-fetch", 1);
                }


                _skillPath[_level] = _data.id;
                _sliceSkillPath = _skillPath.slice(0, _levelNext);
                storageWrap.setItem('skillPath', _sliceSkillPath);

                $.mobile.navigate('#skills-' + _data.id);

            }
        },
        'a[data-is_child="1"],a[data-is_child="4"]');

        elementObj.on({
            click: function () {

                var _$this = $(this),
                        $check = _$this.find('i.fa-check');

                if ($check.length == 0) {

                    _$this.prepend('<i class="fa fa-check" /> ');
                }
                else {

                    $check.remove();
                }

                self.skillSetter(parseInt($(_$this).data('id')));
            }
        },
        'a[data-is_child="0"], a[data-is_child="3"], a[data-is_child="4"]');

        elementObj.on({
            swiperight: function (e) {

                if ($(".ui-page-active").jqmData("panel") !== "open" && e.type === "swiperight") {
                    $("#spe-left-panel").panel("open");
                }
            }
        },
        '.spe-skill-page');

        elementObj.on({
            panelbeforeopen: function () {

                var _list = [],
                        _skillPath = storageWrap.getItem('skillPath');

                for (var i = 0,
                        max = _skillPath.length; i < max; i++) {

                    var _skillItem = storageWrap.getItem(_skillPath[i]);

                    temp = '';
                    if (_skillItem.is_child == 1 || _skillItem.is_child == 4) {

                        temp += '<li><a data-transition="slide" href="#skills-' + _skillItem.parent_id + '"';
                    }

                    temp += ' data-level="' + i + '" data-id="' + _skillItem.id + '" data-parent_id="' + _skillItem.parent_id + '" data-value="' + _skillItem.value + '" data-is_child="' + _skillItem.is_child + '" data-scale_type="' + _skillItem.scale_type + '"  data-display_order="' + _skillItem.display_order + '"  class="spe-skill-item">';
                    temp += self.icons.skill[_skillItem.is_child] + _skillItem.value + '</a></li>';

                    _list.push(temp);
                }

                $('#spe-left-list').html(_list);
                $('#spe-left-list').listview("refresh");
                $(this).trigger("updatelayout");
            }
        },
        '#spe-left-panel');

        elementObj.on({
            swipeleft: function () {

                $.mobile.navigate('#spe-view');
            }
        },
        '.spe-skill-page');

        elementObj.on({
            pagebeforeshow: function () {

                var skillsDatum = self.skillGetter();

                if (skillsDatum.length > 0) {

                    options = {
                        data: skillsDatum,
                        type: 'functionals'
                    };
                    $('#spe-view-content').html(self.skilltree(self, options));
                    self.barrating.edit(self, this);
                }
                else {

                    $('#spe-view-content').html("Pick atleast on functional skills");
                }
            }
        },
        '#spe-view');
    });
};
