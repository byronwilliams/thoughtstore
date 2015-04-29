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
        vm.hasSyncedPosts = false;
        vm.hasUnsyncedPosts = false;
        vm.loaded = false;
        vm.importRequired = true;

        init();

        function init() {
            var listing = ThoughtService.listFromIndexedDb();

            listing.then(function(posts) {
                vm.unsyncedPosts = posts;
                vm.hasUnsyncedPosts = (Object.keys(posts).length > 0);
            });

            if(SessionService.isLoggedIn()) {
                listing
                    .then(ThoughtService.list)
                    .then(function(posts) {
                        vm.syncedPosts = posts;
                        vm.hasSyncedPosts = (Object.keys(posts).length > 0);
                        vm.loaded = true;
                    });
            } else {
                vm.loaded = true;
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
            var isUnsynced = opts.isUnsynced;

            if(isUnsynced) {
                vm.hasUnsyncedPosts = vm.addTo(vm.unsyncedPosts, thought);
            } else {
                vm.hasSyncedPosts = vm.addTo(vm.syncedPosts, thought);
            }
        });

        $scope.$on("deleteThought", function(evt, opts) {
            evt.stopPropagation();

            var thought = opts.thought;
            var isUnsynced = opts.importMode || false;

            ThoughtService.remove(thought, isUnsynced).then(function() {
                if(isUnsynced) {
                    vm.hasUnsyncedPosts = vm.removeFrom(vm.unsyncedPosts, thought);
                } else {
                    vm.hasSyncedPosts = vm.removeFrom(vm.syncedPosts, thought);
                }
            });
        });

        $scope.$on("importThought", function(evt, thought) {
            evt.stopPropagation();

            ThoughtService.doImport(thought).then(function(newThought) {
                vm.hasSyncedPosts = vm.addTo(vm.syncedPosts, newThought);
                vm.hasUnsyncedPosts = vm.removeFrom(vm.unsyncedPosts, thought);
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
