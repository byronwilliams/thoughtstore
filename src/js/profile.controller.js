(function() {
    angular
        .module("ThoughtWorks")
        .controller("ProfileCtrl", ProfileCtrl);

    ProfileCtrl.$inject = ["$rootScope", "$scope", "SessionService"];
    function ProfileCtrl($rootScope, $scope, SessionService) {
        var vm = this;
        vm.user = {};

        init();

        function init(user) {
            if(SessionService.isLoggedIn) {
                vm.user = user;
            }
        }

        vm.logout = function() {
            SessionService.logout();
        }

        $scope.$on("auth:loggedIn", function(user) {
            init(user);
        });

        $scope.$on("auth:loggedOut", function() {
            console.log("auth:loggedOut");
            vm.user = {};
        });
    };
})();
