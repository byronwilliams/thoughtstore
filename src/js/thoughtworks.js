(function() {
    angular
        .module("ThoughtWorks", ["twp", "indexedDB", "luegg.directives", "ui.router"])
        .factory("ThoughtService", ThoughtService)
        .controller("OuterCtrl", OuterCtrl)
        .directive("addThought", addThought)
        .directive("oneThought", oneThought)
        //.constant("API_URL", "http://localhost:7212")
        .constant("API_URL", "http://thoughtstore.figroll.it:7212")
        .constant("AUTH", {
            "loggedIn": 1,
            "loggedOut": 2
        })
        .config(["$indexedDBProvider", function($indexedDBProvider) {
            $indexedDBProvider
              .connection('thoughtworks')
              .upgradeDatabase(1, function(event, db, tx) {
                var objStore = db.createObjectStore('thoughts', {keyPath: 'timestamp'});
              })
              .upgradeDatabase(2, function(event, db, tx) {
                tx.objectStore("thoughts").createIndex("id", "id", { unique: true });
              })
              .upgradeDatabase(3, function(event, db, tx) {
                var objStore = db.createObjectStore('thoughts2', {keyPath: 'id'});
              });
        }])
        .config(["$stateProvider", "$urlRouterProvider", function($stateProvider, $urlRouterProvider) {
            $urlRouterProvider.otherwise("/");
            $stateProvider
                .state('authenticate', {
                    url: "/authenticate",
                    views: {
                        "primary": {
                            templateUrl: "/partials/authenticate.html",
                            controller: "AuthenticateCtrl",
                        }
                    }
                })
                .state('about', {
                    url: "/about",
                    views: {
                        "primary": {
                            templateUrl: "/partials/about.html"
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
        // $interval(ThoughtService.sync, 5000);
        // ThoughtService.sync();
        SessionService.init();
    }

    ThoughtService.$inject = ["$rootScope", "$http", "$q", "$indexedDB", "API_URL", "SessionService"];
    function ThoughtService($rootScope, $http, $q, $indexedDB, API_URL, SessionService) {
        var showDays = 7;
        var thoughts = [];

        var service = {
            showDays: showDays,
            list: list,
            listFromIndexedDb: listFromIndexedDb,
            add: add,
            remove: remove,
            transform: transform,
            doImport: doImport,
            sync: sync,
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
                id: uuid.v1(),
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

        function addToIndexedDb(doc) {
            var deferred = $q.defer();

            $indexedDB.openStore('thoughts2', function(store) {
                store.insert(doc).then(function() {
                    deferred.resolve(asThought(doc));
                }, function(err) {
                    deferred.reject();
                });
            });

            return deferred.promise;
        }

        function remove(thought, isUnsynced) {
            if(isUnsynced) {
                return removeFromIndexedDb(thought);
            } else {
                return $http.delete(API_URL + "/posts/" + thought.id);
            }
        }

        function removeFromIndexedDb(thought) {
            var deferred = $q.defer();

            $indexedDB.openStore('thoughts2', function(store) {
                thought.deleted = true;
                store.upsert(thought).then(function() {
                    deferred.resolve();
                }, function(err) {
                    deferred.reject();
                });
            });

            return deferred.promise;
        }

        function list() {
            if(SessionService.isLoggedIn()) {
                return listFromAPI();
            }

            return listFromIndexedDb();
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

        function listFromIndexedDb() {
            var deferred = $q.defer();

            $indexedDB.openStore('thoughts2', function(store) {
                store.getAll().then(function(ths) {
                    var grouped = {};

                    var sevenDaysAgo = new Date();
                    sevenDaysAgo.setDate(sevenDaysAgo.getDate()-7);


                    var thoughts = ths.filter(function(thought) {
                        return !thought.deleted;
                    });

                    deferred.resolve(transform(thoughts));
                })
            });

            return deferred.promise;
        }

        function transform(raw) {
            var grouped = {};
            raw.map(asThought).sort(function(a, b) {
                // Newest first
                return b.writtenAt - a.writtenAt;
            }).forEach(function(thought) {
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
            });

            return grouped;
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
                allWritten = thoughts.map(function(thought) {
                    var isWritten = $q.defer();

                    $indexedDB.openStore('thoughts2', function(store) {
                        store.find(thought.id).then(function(){
                            isWritten.resolve(thought);
                        }).catch(function() {
                            store.insert(thought).then(function() {
                                isWritten.resolve(thought);
                            }, function(err) {
                                isWritten.reject();
                            });
                        })
                    });

                    return isWritten.promise;
                });

                gotData.resolve();
            }, function(err) {
                console.log(err);
            });

            gotData.promise.then(function() {
                $indexedDB.openStore('thoughts2', function(store) {
                    store.getAll().then(function(ths) {
                        ths.filter(function(thought) {
                            return !thought.persisted && !thought.deleted;
                        }).forEach(function(thought) {
                            $http.post("http://localhost:7212", [thought]).then(function(res) {
                                if(thought.id !== res.data[0].id) {
                                    console.log("id has changed", thought.id, res.data[0].id);
                                    remove(thought).then(function() {
                                        $indexedDB.openStore('thoughts2', function(store) {
                                            console.log(thought);
                                            console.log(res.data[0])
                                            store.insert(res.data[0]).then(function() {

                                            });

                                        });

                                    })

                                }
                            });
                        })
                    });
                });
            });

            // Delete deleted items
            gotData.promise.then(function() {
                $indexedDB.openStore('thoughts2', function(store) {
                    store.getAll().then(function(ths) {
                        ths.filter(function(thought) {
                            return thought.deleted;
                        }).forEach(function(thought) {
                            $http.delete("http://localhost:7212/" + thought.id).then(function(res) {
                                $indexedDB.openStore('thoughts2', function(store) {
                                    store.delete(thought.id);
                                });
                            }, function() {
                                $indexedDB.openStore('thoughts2', function(store) {
                                    store.delete(thought.id);
                                });
                            });
                        });
                    });
                });
            });

            $q.all([gotData.promise, sendData.promise]).then(function() {
                $q.all(allWritten).then(function(thoughts) {
                    $rootScope.$broadcast("itemsSynched", thoughts);
                    localStorage.setItem("lastSync", (new Date()).toJSON());
                });
            });
        }

        function fullSync() {
            return;
            // one way sync at the moment
            $indexedDB.openStore('thoughts2', function(store) {
                store.clear();
            }).then(function() {
                $indexedDB.openStore('thoughts', function(store) {
                    store.getAll().then(function(ths) {
                        ths.forEach(function(thought) {
                            $http.post("http://localhost:7212", [thought]).then(function(res) {
                                $indexedDB.openStore('thoughts2', function(store) {
                                    store.insert(res.data[0]).then(function() {
                                        console.log("added")
                                        // store.delete(thought.timestamp.toJSON()).then(function() {
                                        //     console.log("success");
                                        // })
                                    }, function(err) {
                                        console.log("err", err);
                                    });
                                });
                            }, function() {
                                console.log("HTTP failed")
                            })

                        })
                    });
                });
            });
        }

        function lastUpdated() {
            return localStorage.getItem("cursor");
        }
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

            console.log(vm.notToday);
        });
    }

    function addThought() {
        var directive = {
            restrict: "A",
            templateUrl: "/partials/thoughts/add.html",
            controller: AddThoughtCtrl,
            controllerAs: "vm",
            bindToController: true
        };

        return directive;
    }

    AddThoughtCtrl.$inject = ["$scope", "ThoughtService"];
    function AddThoughtCtrl($scope, ThoughtService) {
        var vm = this;

        vm.reset = function() {
            vm.text = "";

            if(!vm.date || vm.date.length === 0) {
                vm.date = (new Date());
            }
        }

        vm.add = function() {
            console.log("vm.add");
            ThoughtService.add(vm.text, vm.date).then(function(thought) {
                vm.reset();
            });
        }

        vm.reset();
    }

    function oneThought() {
        var directive = {
            restrict: "A",
            templateUrl: "/partials/thoughts/one.html",
            controller: OneThoughtCtrl,
            controllerAs: "vm",
            bindToController: true,
            scope: {
                thought: "=",
                importMode: "="
            }
        };

        return directive;
    }

    OneThoughtCtrl.$inject = ["$scope", "ThoughtService"];
    function OneThoughtCtrl($scope, ThoughtService) {
        var vm = this;
        var oneDayAgo = new Date();
        oneDayAgo.setDate(oneDayAgo.getDate()-1);

        if(vm.importMode || vm.thought.writtenAt.getTime() > oneDayAgo) {
            vm.showTrash = true;
        }

        vm.remove = function() {
            $scope.$emit("deleteThought", {
                thought: vm.thought,
                importMode: vm.importMode
            });
        }

        vm.import = function() {
            $scope.$emit("importThought", vm.thought);
        }
    }

})();