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
        return console && console.error('This browser does not support Storage!');
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
