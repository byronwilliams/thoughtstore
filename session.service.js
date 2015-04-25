(function() {
    angular
        .module("ThoughtWorks")
        .factory("SessionService", SessionService);

    SessionService.$inject = ["$rootScope", "$http", "$q", "$indexedDB"];
    function SessionService($rootScope, $http, $q, $indexedDB) {
        var showDays = 7;
        var thoughts = [];

        var service = {
            isLoggedIn: isLoggedIn
        }

        return service;

        function isLoggedIn() {
            return false;
        }
    }
})();
