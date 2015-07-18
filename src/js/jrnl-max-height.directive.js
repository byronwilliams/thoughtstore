(function() {
    angular
        .module("ThoughtWorks")
        .directive("jrnlMaxHeight", jrnlMaxHeight)
    ;

    function jrnlMaxHeight() {
        var directive = {
            restrict: "A",
            controller: maxHeightCtrl,
            controllerAs: "vm",
            bindToController: true,
            link: linkFn,
            scope: {}
        };

        return directive;
    }

    function maxHeightCtrl() {

    }

    function linkFn(scope, element, attr) {
        var secHeight = 0;
        if(document.getElementById("secondary")) {
             secHeight = document.getElementById("secondary").offsetHeight;
        }

        window.onresize = function() {
            element[0].style.height = document.getElementsByTagName("body")[0].scrollHeight - secHeight + "px";
        }

        element[0].style.height = document.getElementsByTagName("body")[0].scrollHeight - secHeight + "px";
        element[0].style.overflowX = "hidden";
    }

})();
