(function() {
    angular
        .module("ThoughtWorks")
        .factory("SessionService", SessionService);

    SessionService.$inject = ["$rootScope", "$http", "$window", "$state", "API_URL"];
    function SessionService($rootScope, $http, $window, $state, API_URL) {
        var showDays = 7;
        var thoughts = [];

        var service = {
            init: init,
            isLoggedIn: isLoggedIn,
            login: login,
            logout: logout,
            signup: signup,
        }

        return service;

        function init() {
            if(isLoggedIn()) {
                $rootScope.$broadcast("auth:loggedIn");
            }
        }

        function isLoggedIn() {
            return $window.sessionStorage.token && $window.sessionStorage.token.length > 0;
        }

        function login(email, password) {
            return $http.post(API_URL + "/login", {
                "email": email,
                "password": password
            }).then(function(res) {
                $window.sessionStorage.token = res.data.id;

                $rootScope.$broadcast("auth:loggedIn");

                $state.go("list");
            }, function() {
                logout();
            });
        }

        function logout() {
            delete $window.sessionStorage.token;
            $rootScope.$broadcast("auth:loggedOut");
            $state.go("about");
        }

        function signup(fullName, email, password) {
            console.log(fullName, email, password);
            return $http.post(API_URL + "/users", {
                "fullName": fullName,
                "email": email,
                "password": password
            });
        }
    }
})();
