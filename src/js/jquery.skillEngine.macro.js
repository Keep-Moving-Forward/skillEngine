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
                    skillItemHtml += '<a class="skillItem list-group-item" data-level="' + level + '" data-type="' + type + '" data-id="' + data[i].id + '" data-parent_id="' + data[i].parent_id + '" data-value="' + data[i].value + '" data-is_child="' + data[i].is_child + '" data-scale_type="' + data[i].scale_type + '"  data-display_order="' + data[i].display_order + '" data-desc="' + data[i].desc + '"  data-tree_ids="' + data[i].tree_ids + '" href="javascript:void(0);">';
                                        
                    if($.inArray(parseInt(data[i].id), skills[type]) > -1){
                        
                        skillItemHtml += '<i class="fa fa-check"></i> ';
                    }
                    
                    skillItemHtml += self.icons.skill[data[i].is_child];
                    skillItemHtml += data[i].value;

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
                skillItemHtml += '<a class="skillItem list-group-item" data-level="' + level + '" data-type="' + type + '" data-id="' + data.id + '" data-parent_id="' + data.parent_id + '" data-value="' + data.value + '" data-is_child="' + data.is_child + '" data-scale_type="' + data.scale_type + '"  data-display_order="' + data.display_order + '" data-desc="' + data.desc + '" data-tree_ids="' + data.tree_ids + '"  href="javascript:void(0);">';
                skillItemHtml += self.icons.skill[data.is_child];
                skillItemHtml += data.value;

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
                        _level = parseInt(_data.level),
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

                for (i = $li.length - 1, maxi = 0; i >= maxi; i--) {

                    $('a.skillItem[data-id="' + $li[i].dataset.id + '"][data-is_child="1"]').trigger('click');
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
                
                console.log(e);
                
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
