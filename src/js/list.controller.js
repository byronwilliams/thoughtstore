(function() {
    angular
        .module("ThoughtWorks")
        .controller("ThoughtListCtrl", ThoughtListCtrl);

    ThoughtListCtrl.$inject = ["$rootScope", "$scope", "ThoughtService", "SessionService"];
    function ThoughtListCtrl($rootScope, $scope, ThoughtService, SessionService) {
        var vm = this;
        vm.journal = "default";
        vm.posts = {};
        vm.loggedIn = false;

        init();

        function init() {
            if(SessionService.isLoggedIn()) {
                vm.loggedIn = true;

                ThoughtService.list()
                    .then(function(posts) {
                        vm.posts = posts;
                        vm.loaded = true;
                    });
            }
        }

        vm.addTo = function(arr, thought) {
            if(!arr[thought.group]) {
                arr[thought.group] = {
                    group: thought.group,
                    thoughts: [thought]
                }
            } else {
                arr[thought.group].thoughts.push(thought);
            }

            return (Object.keys(arr).length > 0);
        }

        vm.removeFrom = function(arr, thought) {
            var ths = arr[thought.group].thoughts;
            ths.splice(ths.indexOf(thought), 1);

            if(ths.length === 0) {
                delete arr[thought.group];
            }

            return (Object.keys(arr).length > 0);
        }

        $rootScope.$on("thoughtAdded", function(evt, opts) {
            var thought = opts.thought;

            vm.addTo(vm.posts, thought);
        });

        $scope.$on("deleteThought", function(evt, opts) {
            evt.stopPropagation();

            var thought = opts.thought;

            ThoughtService.remove(thought, vm.posts).then(function() {
                vm.removeFrom(vm.posts, thought);
            });
        });

        $scope.$on("auth:loggedIn", function() {
            init();
        });

        $scope.$on("auth:loggedOut", function() {
            vm.posts = {};
            vm.loggedIn = false;
        });
    };
})();
