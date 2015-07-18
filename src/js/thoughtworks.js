(function() {
    angular
        .module("ThoughtWorks", ["twp", "luegg.directives", "ui.router"])
        .factory("ThoughtService", ThoughtService)
        .controller("OuterCtrl", OuterCtrl)
        .controller("AddOuterCtrl", AddOuterCtrl)
        // .constant("API_URL", "http://jrnl.today:7212")
        .constant("API_URL", "http://thoughtstore.figroll.it:7212")
        .config(["$stateProvider", "$urlRouterProvider", function($stateProvider, $urlRouterProvider) {
            $urlRouterProvider.otherwise("/");
            $stateProvider
                .state('authenticate', {
                    url: "/authenticate",
                    views: {
                        "primary": {
                            templateUrl: "/partials/authenticate.html",
                            controller: "AuthenticateCtrl",
                            controllerAs: "vm"
                        }
                    }
                })
                .state('list', {
                    url: "/",
                    views: {
                        "primary": {
                            templateUrl: "/partials/thoughts/list.html",
                            controller: "ThoughtListCtrl",
                            controllerAs: "vm"
                        },
                        "secondary": {
                            templateUrl: "/partials/thoughts/add_outer.html"
                        }
                    }
                })
        }])
        .filter("nl2br", ["$sce", "$filter", function($sce, $filter) {
            return function(data) {
                if (!data) {
                    return data;
                }
                return $sce.trustAsHtml(data.replace(/\n\r?/g, '<br />'));
            };
        }])
        .factory('authInterceptor', ["$rootScope", "$q", "$window", function ($rootScope, $q, $window) {
          return {
            request: function (config) {
              config.headers = config.headers || {};
              if ($window.sessionStorage.token) {
                config.headers.Authorization = $window.sessionStorage.token;
              }
              return config;
            },
            response: function (response) {
              if (response.status === 401) {
                // handle the case where the user is not authenticated
              }
              return response || $q.when(response);
            }
          };
        }])
        .config(["$httpProvider", function ($httpProvider) {
          $httpProvider.interceptors.push('authInterceptor');
        }])
        .run(runBlock)
    ;

    runBlock.$inject = ["SessionService", "$interval"];
    function runBlock(SessionService, $interval) {
        SessionService.init();
    }

    ThoughtService.$inject = ["$rootScope", "$http", "$q", "API_URL", "SessionService"];
    function ThoughtService($rootScope, $http, $q, API_URL, SessionService) {
        var showDays = 7;
        var thoughts = [];

        var service = {
            showDays: showDays,
            list: list,
            add: add,
            remove: remove,
            transform: transform,
            lastUpdated: lastUpdated,
            dateToGroup: dateToGroup
        }

        return service;

        function dateToGroup(timestamp) {
            return (new Date(timestamp.getFullYear(),
                             timestamp.getMonth(),
                             timestamp.getDate())).toJSON();
        }

        function asThought(thought) {
            thought.text = thought.text.trim();
            thought.writtenAt = new Date(thought.writtenAt);
            thought.createdAt = new Date(thought.createdAt);
            thought.updatedAt = new Date(thought.updatedAt);
            thought.group = dateToGroup(thought.writtenAt);
            return thought;
        }

        function prepDoc(text, date) {
            if(!date) {
                date = new Date();
            }

            if(typeof(date) === "string") {
                var now = new Date();
                var then = new Date(date);
                then.setHours(now.getHours());
                then.setMinutes(now.getMinutes());
                then.setSeconds(now.getSeconds());
                then.setMilliseconds(now.getMilliseconds());
                date = then;
            }

            return {
                text: text,
                writtenAt: date.toJSON(),
                createdAt: (new Date()).toJSON(),
                updatedAt: (new Date()).toJSON(),
            };
        }

        function add(text, date) {
            if(SessionService.isLoggedIn()) {
                return addToDb(prepDoc(text, date)).then(function(thought) {
                    $rootScope.$broadcast("thoughtAdded", {thought: thought, isUnsynced: false});
                });
            }

            return addToIndexedDb(prepDoc(text, date)).then(function(thought) {
                $rootScope.$broadcast("thoughtAdded", {thought: thought, isUnsynced: true});
            });
        }

        function addToDb(doc) {
            var deferred = $q.defer();

            $http.post(API_URL + "/posts", doc).then(function(res) {
                deferred.resolve(asThought(res.data));
            }, function(err) {
                deferred.reject();
            });

            return deferred.promise;
        }


        function remove(thought, isUnsynced) {
            return $http.delete(API_URL + "/posts/" + thought.id);
        }


        function list() {
            return listFromAPI();
        }

        function listFromAPI() {
            var deferred = $q.defer();

            $http.get(API_URL + "/posts").then(function(res) {
                deferred.resolve(transform(res.data));
            }, function() {
                deferred.reject();
            });

            return deferred.promise;
        }


        function transform(raw) {
            var result = [];
            var grouped = {};

            raw.map(asThought).forEach(function(thought) {
                if(!grouped[thought.group]) {
                    grouped[thought.group] = {
                        group: thought.group,
                        thoughts: [thought]
                    };
                } else {
                    grouped[thought.group].thoughts.push(thought);
                }
            });

            Object.keys(grouped).forEach(function(k) {
                grouped[k].thoughts = grouped[k].thoughts.sort(function(a, b) {
                    return a.writtenAt - b.writtenAt;
                });

                result.push({
                    "group": grouped[k].group,
                    "thoughts": grouped[k].thoughts
                });
            });

            return result.sort(function(a, b) {
                return b.group - a.group;
            });
        }

        function doImport(thought) {
            var deferred = $q.defer();

            addToDb(thought).then(function(newDoc) {
                removeFromIndexedDb(thought).then(function() {
                    deferred.resolve(newDoc);
                });
            });

            return deferred.promise;
        }

        function sync() {
            // fullSync();
            //return
            var lastSync = localStorage.getItem("lastSync");
            var gotData = $q.defer();
            var sendData = $q.defer();
            var allWritten;

            $http.get("http://localhost:7212?since=" + lastSync).then(function(res) {
                var thoughts = res.data.map(asThought);
                gotData.resolve();
            }, function(err) {
                console.log(err);
            });
        }

        function lastUpdated() {
            return localStorage.getItem("cursor");
        }
    }

    AddOuterCtrl.$inject = ["$rootScope", "$scope", "ThoughtService", "SessionService"];
    function AddOuterCtrl($rootScope, $scope, ThoughtService, SessionService) {
        var vm = this;
        vm.isLoggedIn = SessionService.isLoggedIn();

        $scope.$on("auth:loggedIn", function() {
            vm.isLoggedIn = true;
            console.log(vm.isLoggedIn);
        });

        $scope.$on("auth:loggedOut", function() {
            vm.isLoggedIn = false;
        });
    }

    OuterCtrl.$inject = ["$rootScope", "$scope", "ThoughtService", "SessionService"];
    function OuterCtrl($rootScope, $scope, ThoughtService, SessionService) {
        var vm = this;
        vm.today = [];
        vm.notToday = {};
        vm.isLoggedIn = SessionService.isLoggedIn();

        $scope.$on("auth:loggedIn", function() {
            vm.isLoggedIn = true;
        });

        $scope.$on("auth:loggedOut", function() {
            vm.isLoggedIn = false;
        });

        // reload();

        // function reload() {
        //     ThoughtService.filter().then(function(thoughts) {
        //         vm.notToday = thoughts;
        //     });
        // }

        vm.remove = function($index) {
            console.log($index);
            // ThoughtService.remove(vm.thought).then(function() {
            //     $scope.$emit("thoughtDeleted", vm.thought);
            // });
        }

        // $scope.$on("thoughtDeleted", function(evt, thought) {
        //     reloadToday();
        //     reloadOlder();
        // });

        $scope.$on("itemsSynched", function(evt, thoughts) {
            return;
            thoughts.sort(function(a, b) {
                // Newest first
                return b.writtenAt - a.writtenAt;
            }).forEach(function(thought) {
                var group;
                console.log(thought);

                if(!vm.notToday[thought.group]) {
                    group = vm.notToday[thought.group] = {
                        group: thought.group,
                        thoughts: []
                    };
                } else {
                    group = vm.notToday[thought.group];
                }

                group.thoughts.push(thought);
            });
        });
    }
})();
