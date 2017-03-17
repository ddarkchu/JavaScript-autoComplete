/*
    JavaScript autoComplete v1.0.4
    Copyright (c) 2014 Simon Steinberger / Pixabay
    GitHub: https://github.com/Pixabay/JavaScript-autoComplete
    License: http://www.opensource.org/licenses/mit-license.php
*/

var autoComplete = (function() {
    // "use strict";
    function autoComplete(options) {
        // 쿼리 샐랙터 있는지 확인.
        if (!document.querySelector) return;

        // 유틸성 함수 정의.
        // helpers 클랙스 존재여부 체크 함수.
        function hasClass(el, className) {
            return el.classList ? el.classList.contains(className) : new RegExp('\\b' + className + '\\b').test(el.className);
        }
        //이벤트 추가 함수. attachEvent ie 용 함수, standard api는 addEventListener
        function addEvent(el, type, handler) {
            if (el.attachEvent) el.attachEvent('on' + type, handler);
            else el.addEventListener(type, handler);
        }
        //이벤트 제거 함수, detachEvent ie용.  if (el.removeEventListener) not working in IE11
        function removeEvent(el, type, handler) {
            if (el.detachEvent) el.detachEvent('on' + type, handler);
            else el.removeEventListener(type, handler);
        }

        // live : list에 이벤트 적용하고 item값에
        // elClass  타깃 클래스
        // event 이름 keydown  등같은 이벤트의 이름
        // cb callback 함수
        // context : 적용 list div tag요소, 없으면 document에 이벤트 적용됨.
        function live(elClass, event, cb, context) {
            addEvent(context || document, event, function(e) {

                var found, el = e.target || e.srcElement;
                console.log(e.type,el);
                while (el && !(found = hasClass(el, elClass))) el = el.parentElement; // elClass를 찾아 콜벡에 전달.
                if (found) cb.call(el, e);
            });
        }

        // 사용 구조체 정의
        var o = {
            selector: 0, //오토컴플릿지정 요소 셀랙터.
            source: 0, // 오토컴플릿 데이터 가져오는 함수.
            minChars: 3, // 몇글자에 오토컴플릿 표시할지 지정 값.
            delay: 150, // 오토컴플릿 로드하는데 딜ㄹ레이
            offsetLeft: 0, // absolute 로 그릴 때 왼쪽 오프셋 값
            offsetTop: 1, //  absolute 로 그릴 때 상단 오프셋 값
            cache: 1, // 캐쉬 사용여부.
            menuClass: '', // 오토컴플릿 리스트의 클래스 줄수 있는 변수. ()
            renderItem: function(item, search) { //검색결과에서 검색어 하이라이트 함수.
                // escape special characters
                search = search.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
                var re = new RegExp("(" + search.split(' ').join('|') + ")", "gi");
                return '<div class="autocomplete-suggestion" data-val="' + item + '">' + item.replace(re, "<b>$1</b>") + '</div>';
            },
            onSelect: function(e, term, item) {} // 검색결과중 선택 되어졌을 때 실행되는 이벤트 정의.
        };

        // 구조체 초기화.
        for (var k in options) { // 사용 구조체에 값을 복사함.
            if (options.hasOwnProperty(k)) o[k] = options[k];
        }

        // 서비스 설정.
        // elems
        var elems = typeof o.selector == 'object' ? [o.selector] : document.querySelectorAll(o.selector);
        for (var i = 0; i < elems.length; i++) {
            var that = elems[i];

            // create suggestions container "sc" 검색어 목록 div
            that.sc = document.createElement('div');
            that.sc.className = 'autocomplete-suggestions ' + o.menuClass; // 목록 디폴트 클래스 autocomplete-suggestions 지정, 사용자 클래스 추가.
            that.autocompleteAttr = that.getAttribute('autocomplete'); // 해당 플러그인 디스트로이 시 복원 위해서 오토 컴플릿 속성 저장
            that.setAttribute('autocomplete', 'off'); // 브라우저 오토 컴플릿 속성 정지.
            that.cache = {}; // 검색어에 대한 캐쉬 값.
            that.last_val = ''; // 마지막 입력값.


            that.updateSC = updateSC; // 업데이트 함수.
            addEvent(window, 'resize', that.updateSC);
            document.body.appendChild(that.sc);



            // 이벤트 등록.
            live('autocomplete-suggestion', 'mouseleave', function(e) {
                var sel = that.sc.querySelector('.autocomplete-suggestion.selected');
                if (sel) setTimeout(function() {
                    sel.className = sel.className.replace(' selected', '');
                }, 20);
            }, that.sc);

            live('autocomplete-suggestion', 'mouseover', function(e) {
                var sel = that.sc.querySelector('.autocomplete-suggestion.selected');
                if (sel) sel.className = sel.className.replace(' selected', '');
                this.className += ' selected';
            }, that.sc);

            live('autocomplete-suggestion', 'mousedown', function(e) {
                if (hasClass(this, 'autocomplete-suggestion')) { // else outside click
                    var v = this.getAttribute('data-val');
                    that.value = v;
                    o.onSelect(e, v, this);
                    that.sc.style.display = 'none';
                }
            }, that.sc);

            that.blurHandler = function() {
                try {
                    var over_sb = document.querySelector('.autocomplete-suggestions:hover');
                } catch (e) {
                    var over_sb = 0;
                }
                if (!over_sb) {
                    that.last_val = that.value;
                    that.sc.style.display = 'none';
                    setTimeout(function() {
                        that.sc.style.display = 'none';
                    }, 350); // hide suggestions on fast input
                } else if (that !== document.activeElement) setTimeout(function() {
                    that.focus();
                }, 20);
            };
            addEvent(that, 'blur', that.blurHandler);

            var suggest = function(data) {
                var val = that.value;
                that.cache[val] = data;
                if (data.length && val.length >= o.minChars) {
                    var s = '';
                    for (var i = 0; i < data.length; i++) s += o.renderItem(data[i], val);
                    that.sc.innerHTML = s;
                    that.updateSC(0);
                } else
                    that.sc.style.display = 'none';
            }

            that.keydownHandler = function(e) {
                var key = window.event ? e.keyCode : e.which;
                // down (40), up (38)
                if ((key == 40 || key == 38) && that.sc.innerHTML) {
                    var next, sel = that.sc.querySelector('.autocomplete-suggestion.selected');
                    if (!sel) { //초기 또는 시작에서 위로 끝에서 아래로 이동시 셀렉트 풀리게 되는데 이 때 40번 누르면 첫번째 값으로
                        // 38 번 누르면 마지막 값으로 선택
                        next = (key == 40) ? that.sc.querySelector('.autocomplete-suggestion') : that.sc.childNodes[that.sc.childNodes.length - 1]; // first : last
                        next.className += ' selected';
                        that.value = next.getAttribute('data-val');
                    } else {
                        next = (key == 40) ? sel.nextSibling : sel.previousSibling;
                        if (next) {
                            sel.className = sel.className.replace('selected', '');
                            next.className += ' selected';
                            that.value = next.getAttribute('data-val');
                        } else { // 시작 또는 마지막 때 선택 해제.
                            sel.className = sel.className.replace(' selected', '');
                            that.value = that.last_val;
                            next = 0;
                        }
                    }
                    that.updateSC(0, next);
                    return false;
                }
                // esc
                else if (key == 27) {
                    that.value = that.last_val;
                    that.sc.style.display = 'none';
                }
                // enter
                else if (key == 13 || key == 9) {
                    var sel = that.sc.querySelector('.autocomplete-suggestion.selected');
                    if (sel && that.sc.style.display != 'none') {
                        o.onSelect(e, sel.getAttribute('data-val'), sel);
                        setTimeout(function() {
                            that.sc.style.display = 'none';
                        }, 20);
                    }
                }
            };
            addEvent(that, 'keydown', that.keydownHandler);

            that.keyupHandler = function(e) {
                var key = window.event ? e.keyCode : e.which;
                if (!key || (key < 35 || key > 40) && key != 13 && key != 27) {
                    var val = that.value; // 인풋박스의 입력값
                    if (val.length >= o.minChars) {
                        if (val != that.last_val) {
                            that.last_val = val;
                            clearTimeout(that.timer);
                            if (o.cache) {
                                if (val in that.cache) {
                                    suggest(that.cache[val]);
                                    return;
                                }
                                // no requests if previous suggestions were empty
                                for (var i = 1; i < val.length - o.minChars; i++) {
                                    var part = val.slice(0, val.length - i);
                                    if (part in that.cache && !that.cache[part].length) {
                                        suggest([]);
                                        return;
                                    }
                                }
                            }
                            that.timer = setTimeout(function() {
                                o.source(val, suggest)
                            }, o.delay);
                        }
                    } else {
                        that.last_val = val;
                        that.sc.style.display = 'none';
                    }
                }
            };
            addEvent(that, 'keyup', that.keyupHandler);

            that.focusHandler = function(e) {
                that.last_val = '\n';
                that.keyupHandler(e)
            };
            if (!o.minChars) addEvent(that, 'focus', that.focusHandler);
        }

        // public destroy method
        this.destroy = function() {
            for (var i = 0; i < elems.length; i++) {
                var that = elems[i];
                removeEvent(window, 'resize', that.updateSC);
                removeEvent(that, 'blur', that.blurHandler);
                removeEvent(that, 'focus', that.focusHandler);
                removeEvent(that, 'keydown', that.keydownHandler);
                removeEvent(that, 'keyup', that.keyupHandler);
                if (that.autocompleteAttr)
                    that.setAttribute('autocomplete', that.autocompleteAttr);
                else
                    that.removeAttribute('autocomplete');
                document.body.removeChild(that.sc);
                that = null;
            }
        };

        // resize : 너비만 업데이트 할때 0을 주어서 사용.
        // next 키보드를 이용해서 이동할때 스크롤 조정 시킴.
        function updateSC(resize, next) {
            var rect = that.getBoundingClientRect(); //input 태그 사격형 길이 가져옴.
            // input tag 왼쪽 값 구하가 input 왼쪽 값 + 스크롤 위치 값 + 보정값
            that.sc.style.left = Math.round(rect.left + (window.pageXOffset || document.documentElement.scrollLeft) + o.offsetLeft) + 'px';
            // input tag 위쪽 값 구하기.
            that.sc.style.top = Math.round(rect.bottom + (window.pageYOffset || document.documentElement.scrollTop) + o.offsetTop) + 'px';
            // input tag 너비 구하기, 패딩 마진 등의 값이 포함됨.
            that.sc.style.width = Math.round(rect.right - rect.left) + 'px'; // outerWidth
            if (!resize) { // window resize 이외 강제 호출시 적용.
                that.sc.style.display = 'block';
                if (!that.sc.maxHeight) {
                    that.sc.maxHeight = parseInt((window.getComputedStyle ? getComputedStyle(that.sc, null) : that.sc.currentStyle).maxHeight);
                }
                // that.sc.suggestionHeight 높이 임시 저장.
                if (!that.sc.suggestionHeight) {
                    that.sc.suggestionHeight = that.sc.querySelector('.autocomplete-suggestion').offsetHeight;
                }
                if (that.sc.suggestionHeight) { // 목록 최대 높이 가져오기.
                    if (!next) that.sc.scrollTop = 0; // 선택이 아니면 스크롤 위치 0으로 지정.
                    else {
                        var scrTop = that.sc.scrollTop, // 현재 스크롤 위치 저장.
                            selTop = next.getBoundingClientRect().top - that.sc.getBoundingClientRect().top;
                        // selTop : list의 높이 값 top  (선택 값의 top - 목록의 탑 선택값의 top)
                        if (selTop + that.sc.suggestionHeight - that.sc.maxHeight > 0) { // 선택 item 위치가 리스트 밖에 있으면 0보다 큼.
                            // selTop + that.sc.suggestionHeight : list의 bottom 포함된 높이.
                            that.sc.scrollTop = selTop + that.sc.suggestionHeight + scrTop - that.sc.maxHeight;
                            // 아이템을 하단에 보이도록 스크롤 이동.
                        } else if (selTop < 0) { // 스크롤이 내려가 있고 선택값이 상단에 있을때 스크롤 이동.
                            that.sc.scrollTop = selTop + scrTop;
                            // 아이템을 상단에 보이도록 스크롤 이동.
                        }
                    }
                }
            }
        }
    }
    return autoComplete;
})();

(function() {
    if (typeof define === 'function' && define.amd) // amd module 체크
        define('autoComplete', function() {
            return autoComplete;
        });
    else if (typeof module !== 'undefined' && module.exports) // commonjs module 체크
        module.exports = autoComplete;
    else // 브라우저 객체.
        window.autoComplete = autoComplete;
})();
