(function() {
    angular
        .module("ThoughtWorks")
        .controller("AuthenticateCtrl", AuthenticateCtrl);

    AuthenticateCtrl.$inject = ["$rootScope", "$scope", "SessionService"];
    function AuthenticateCtrl($rootScope, $scope, SessionService) {
        $scope.login = function(email, password) {
            SessionService.login(email, password).then(function() {

            }, function() {

            });
        }

        $scope.signup = function(fullName, email, password) {
            SessionService.signup(fullName, email, password).then(function() {

            }, function() {

            });
        }
    };
})();
