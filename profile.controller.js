(function() {
    angular
        .module("ThoughtWorks")
        .controller("ProfileCtrl", ProfileCtrl);

    ProfileCtrl.$inject = ["$rootScope", "$scope", "SessionService"];
    function ProfileCtrl($rootScope, $scope, SessionService) {
        init();

        function init() {
            $scope.isLoggedIn = SessionService.isLoggedIn();

            $scope.profile.user = {
                fullName: "Byron Williams",
                gravatar: "https://en.gravatar.com/userimage/665754/2511c1c9479ae582ab4f4e9b84425590.jpg"
            };
        }

        $rootScope.$on("auth:loggedIn", function() {
            init();
        })
    };
})();
