(function() {
    angular
        .module("ThoughtWorks", ["indexedDB", "luegg.directives"])
        .factory("ThoughtService", ThoughtService)
        .controller("OuterCtrl", OuterCtrl)
        .directive("addThought", addThought)
        .directive("oneThought", oneThought)
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
        .filter("nl2br", ["$sce", "$filter", function($sce, $filter) {
         return function(data) {
           if (!data) return data;
           return $sce.trustAsHtml(data.replace(/\n\r?/g, '<br />'));
         };
        }])
        .run(runBlock)
    ;

    runBlock.$inject = ["ThoughtService", "$interval"];
    function runBlock(ThoughtService, $interval) {
        // $interval(ThoughtService.sync, 5000);
        ThoughtService.sync();
    }

    ThoughtService.$inject = ["$rootScope", "$http", "$q", "$indexedDB"];
    function ThoughtService($rootScope, $http, $q, $indexedDB) {
        var showDays = 7;
        var thoughts = [];

        var service = {
            showDays: showDays,
            add: add,
            remove: remove,
            filter: filter,
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

        function add(text, date) {
            var deferred = $q.defer();

            $indexedDB.openStore('thoughts2', function(store) {
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

                var doc = {
                    id: uuid.v1(),
                    text: text,
                    writtenAt: date.toJSON(),
                    createdAt: (new Date()).toJSON(),
                    updatedAt: (new Date()).toJSON(),
                };

                store.insert(doc).then(function(e) {
                    console.log("inserted")
                    deferred.resolve(asThought(doc));
                }, function(err) {
                    console.log(err);
                    deferred.reject();
                })
            });

            return deferred.promise;
        }

        function remove(thought) {
            var deferred = $q.defer();

            $indexedDB.openStore('thoughts2', function(store) {
                thought.deleted = true;
                store.upsert(thought).then(function() {
                    deferred.resolve();
                }, function(err) {
                    console.log(err);
                    deferred.reject();
                });
            });

            return deferred.promise;
        }

        function filter() {
            var deferred = $q.defer();

            $indexedDB.openStore('thoughts2', function(store) {
                store.getAll().then(function(ths) {
                    var grouped = {};

                    var thoughts = ths.filter(function(thought) {
                        return !thought.deleted;
                    }).map(asThought).sort(function(a, b) {
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

                    deferred.resolve(grouped);
                })
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

    OuterCtrl.$inject = ["$rootScope", "$scope", "ThoughtService"];
    function OuterCtrl($rootScope, $scope, ThoughtService) {
        var vm = this;
        vm.today = [];
        vm.notToday = {};

        reload();

        function reload() {
            ThoughtService.filter().then(function(thoughts) {
                vm.notToday = thoughts;
            });
        }

        vm.remove = function($index) {
            console.log($index);
            // ThoughtService.remove(vm.thought).then(function() {
            //     $scope.$emit("thoughtDeleted", vm.thought);
            // });
        }

        $rootScope.$on("thoughtAdded", function(evt, thought) {
            console.log(thought)
            if(!vm.notToday[thought.group]) {
                vm.notToday[thought.group] = {
                    group: thought.group,
                    thoughts: [thought]
                }
            } else {
                vm.notToday[thought.group].thoughts.push(thought);
            }
        });

        // $scope.$on("thoughtDeleted", function(evt, thought) {
        //     reloadToday();
        //     reloadOlder();
        // });

        $scope.$on("deleteThought", function(evt, thought) {
            evt.stopPropagation();

            ThoughtService.remove(thought).then(function() {
                var ths = vm.notToday[thought.group].thoughts;
                ths.splice(ths.indexOf(thought), 1);
            });
        });

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
            templateUrl: "thoughts/add.html",
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
            ThoughtService.add(vm.text, vm.date).then(function(thought) {
                $scope.$emit("thoughtAdded", thought);
                vm.reset();
            });
        }

        vm.reset();
    }

    function oneThought() {
        var directive = {
            restrict: "A",
            templateUrl: "thoughts/one.html",
            controller: OneThoughtCtrl,
            controllerAs: "vm",
            bindToController: true,
            scope: {
                thought: "="
            }
        };

        return directive;
    }

    OneThoughtCtrl.$inject = ["$scope", "ThoughtService"];
    function OneThoughtCtrl($scope, ThoughtService) {
        var vm = this;
        var oneDayAgo = new Date();
        oneDayAgo.setDate(oneDayAgo.getDate()-1);

        vm.showTrash = vm.thought.writtenAt.getTime() > oneDayAgo;

        vm.remove = function() {
            $scope.$emit("deleteThought", vm.thought);
        }
    }

})();
