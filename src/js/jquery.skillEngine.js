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
    type: ["functionals", "behavioural", "managerial"],
    functionals: {
        name: 'functionals',
        title: '<i class="fa fa-magic"></i> Functional Skills',
        id: "panelFunSkill",
        selector: "section#sectionFunSkill",
        colorClass: "info",
        level: [
            'ajith', 'alagu', 'elas', 'raja', 'ravi', 'yuva', 'kavi', 'ramu'
        ],
        isSearch: true,
        isLegend: false,
        isTour: false,
        skillLimit: 999
    },
    behavioural: {
        name: 'behavioural',
        title: '<i class="fa fa-tags"></i> Behavioural Skills',
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
    'ajith', 'alagu', 'elas', 'raja', 'ravi', 'yuva', 'kavi',
    'ramu'
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