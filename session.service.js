(function() {
    angular
        .module("ThoughtWorks")
        .factory("SessionService", SessionService);

    SessionService.$inject = ["$rootScope", "$http", "$q", "$indexedDB"];
    function SessionService($rootScope, $http, $q, $indexedDB) {
        var showDays = 7;
        var thoughts = [];

        var service = {
            isLoggedIn: isLoggedIn,
            login: login,
            logout: logout,
            signup: signup,
        }

        return service;

        function isLoggedIn() {
            return false;
        }

        function login(email, password) {

        }

        function logout() {

        }

        function signup(fullName, email, password) {

        }
    }
})();
