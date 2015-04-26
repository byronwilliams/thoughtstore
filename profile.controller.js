(function() {
    angular
        .module("ThoughtWorks")
        .controller("ProfileCtrl", ProfileCtrl);

    ProfileCtrl.$inject = ["$rootScope", "$scope", "SessionService"];
    function ProfileCtrl($rootScope, $scope, SessionService) {
        var vm = this;
        vm.user = {};

        init();

        function init() {
            if(SessionService.isLoggedIn) {
                vm.user = {
                    fullName: "Byron Williams",
                    gravatar: "https://en.gravatar.com/userimage/665754/2511c1c9479ae582ab4f4e9b84425590.jpg"
                };
            }
        }

        vm.logout = function() {
            SessionService.logout();
        }

        $scope.$on("auth:loggedIn", function() {
            init();
        });

        $scope.$on("auth:loggedOut", function() {
            console.log("auth:loggedOut");
            vm.user = {};
        });
    };
})();
