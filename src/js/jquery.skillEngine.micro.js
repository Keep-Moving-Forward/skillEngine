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
