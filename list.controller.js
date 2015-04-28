(function() {
    angular
        .module("ThoughtWorks")
        .controller("ThoughtListCtrl", ThoughtListCtrl);

    ThoughtListCtrl.$inject = ["$rootScope", "$scope", "ThoughtService", "SessionService"];
    function ThoughtListCtrl($rootScope, $scope, ThoughtService, SessionService) {
        var vm = this;
        vm.journal = "default";
        vm.syncedPosts = {};
        vm.unsyncedPosts = {};
        vm.hasPosts = false;
        vm.loaded = false;
        vm.importRequired = true;

        init();

        $scope.$watch("syncedPosts", function(before, after) {
            vm.hasSyncedPosts = (Object.keys(after).length > 0);
        });

        $scope.$watch("unsyncedPosts", function(before, after) {
            vm.hasUnsyncedPosts = (Object.keys(after).length > 0);
        });


        function init() {
            if(SessionService.isLoggedIn()) {
                ThoughtService.list().then(function(posts) {
                    vm.syncedPosts = posts;
                    vm.loaded = true;
                });
            }

            ThoughtService.listFromIndexedDb().then(function(posts) {
                vm.unsyncedPosts = posts;
            });
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
        }

        vm.removeFrom = function(arr, thought) {
            var ths = arr[thought.group].thoughts;
            ths.splice(ths.indexOf(thought), 1);

            if(ths.length === 0) {
                delete arr[thought.group];
            }
        }

        $rootScope.$on("thoughtAdded", function(evt, thought) {
            vm.addTo(vm.syncedPosts, thought);
        });

        $scope.$on("deleteThought", function(evt, opts) {
            evt.stopPropagation();

            var thought = opts.thought;
            var isUnsynced = opts.importMode || false;

            ThoughtService.remove(thought, isUnsynced).then(function() {
                if(isUnsynced) {
                    vm.removeFrom(vm.unsyncedPosts, thought);
                } else {
                    vm.removeFrom(vm.syncedPosts, thought);
                }
            });
        });

        $scope.$on("importThought", function(evt, thought) {
            evt.stopPropagation();

            ThoughtService.doImport(thought).then(function(newThought) {
                vm.addTo(vm.syncedPosts, newThought);
                vm.removeFrom(vm.unsyncedPosts, thought);
            });
        });

        $scope.$on("auth:loggedIn", function() {
            init();
        });

        $scope.$on("auth:loggedOut", function() {
            $scope.syncedPosts = {};
        });
    };
})();
