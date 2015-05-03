(function() {
    angular
        .module("ThoughtWorks")
        .controller("AuthenticateCtrl", AuthenticateCtrl);

    AuthenticateCtrl.$inject = ["$rootScope", "$scope", "SessionService"];
    function AuthenticateCtrl($rootScope, $scope, SessionService) {
        var vm = this;
        vm.loginError = 200;
        vm.registerError = 200;

        vm.login = function(email, password) {
            SessionService.login(email, password).then(function() {
                vm.loginError = 200;
            }, function(res) {
                vm.loginError = res.status;
            });
        }

        vm.signup = function(fullName, email, password) {
            SessionService.signup(fullName, email, password).then(function() {
                vm.registerError = 200;
            }, function(res) {
                console.log(res);
                vm.registerError = res.status;
            });
        }
    };
})();
