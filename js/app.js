'use strict';
(function() {
  Helpers.validateSaveVersion();

  var game = new Game.Game();
  game.load();

  var lab = game.lab;
  var research = game.research;
  var workers = game.workers;
  var upgrades = game.upgrades;
  var achievements = game.achievements;
  var allObjects = game.allObjects;
  var lastSaved;

  var app = angular.module('particleClicker', []);

  app.filter('niceNumber', ['$filter', function($filter) {
      return Helpers.formatNumberPostfix;
  }]);

  app.filter('niceTime', ['$filter', function($filter) {
      return Helpers.formatTime;
  }]);

  app.filter('currency', ['$filter', function($filter) {
    return function(input) {
      var code = (ObjectStorage.load('profile') || {}).currency || 'GC';
      return code + ' ' + $filter('niceNumber')(input);
    };
  }]);

  app.filter('reverse', ['$filter', function($filter) {
    return function(items) {
      return items.slice().reverse();
    };
  }]);

  app.controller('DetectorController', function() {
    this.click = function() {
      lab.clickDetector();
      detector.addEvent();
      UI.showUpdateValue("#update-data", lab.state.detector);
      return false;
    };
  });

  // Hack to prevent text highlighting
  document.getElementById('detector').addEventListener('mousedown', function(e) {
    e.preventDefault();
  });

  app.controller('LabController', ['$interval', function($interval) {
    this.lab = lab;
    this.showDetectorInfo = function() {
      if (!this._detectorInfo) {
        this._detectorInfo = Helpers.loadFile('html/detector.html');
      }
      UI.showModal('Detector', this._detectorInfo);
    };
    $interval(function() {  // one tick
      var grant = lab.getGrant();
      UI.showUpdateValue("#update-funding", grant);
      var sum = 0;
      for (var i = 0; i < workers.length; i++) {
        sum += workers[i].state.hired * workers[i].state.rate;
      }
      if (sum > 0) {
        lab.acquireData(sum);
        UI.showUpdateValue("#update-data", sum);
        detector.addEventExternal(workers.map(function(w) {
          return w.state.hired;
        }).reduce(function(a, b){return a + b}, 0));
      }
    }, 1000);
  }]);

  app.controller('ResearchController', ['$compile', function($compile) {
    this.research = research;
    this.isVisible = function(item) {
      return item.isVisible(lab);
    };
    this.isAvailable = function(item) {
      return item.isAvailable(lab);
    };
    this.doResearch = function(item) {
      var cost = item.research(lab);
      if (cost > 0) {
        UI.showUpdateValue("#update-data", -cost);
        UI.showUpdateValue("#update-reputation", item.state.reputation);
      }
    };
    this.showInfo = function(r) {
      UI.showModal(r.name, r.getInfo());
      UI.showLevels(r.state.level);
    };
  }]);

  app.controller('HRController', function() {
    this.workers = workers;
    this.isVisible = function(worker) {
      return worker.isVisible(lab);
    };
    this.isAvailable = function(worker) {
      return worker.isAvailable(lab);
    };
    this.hire = function(worker) {
      var cost = worker.hire(lab);
      if (cost > 0) {
        UI.showUpdateValue("#update-funding", -cost);
      }
    };
  });

  app.controller('UpgradesController', function() {
    this.upgrades = upgrades;
    this.isVisible = function(upgrade) {
      return upgrade.isVisible(lab, allObjects);
    };
    this.isAvailable = function(upgrade) {
      return upgrade.isAvailable(lab, allObjects);
    };
    this.upgrade = function(upgrade) {
      if (upgrade.buy(lab, allObjects)) {
        UI.showUpdateValue("#update-funding", upgrade.cost);
      }
    }
  });

  app.controller('AchievementsController', function($scope) {
    $scope.achievements = achievements;
    $scope.progress = function() {
      return achievements.filter(function(a) { return a.validate(lab, allObjects, lastSaved); }).length;
    };
  });

  app.controller('SaveController',
      ['$scope', '$interval', function($scope, $interval) {
    lastSaved = new Date().getTime();
    $scope.lastSaved = lastSaved;
    $scope.saveNow = function() {
      var saveTime = new Date().getTime();
      game.lab.state.time += saveTime - lastSaved;
      game.save();
      lastSaved = saveTime;
      $scope.lastSaved = lastSaved;
    };
    $scope.restart = function() {
      if (window.confirm(
        'Do you really want to restart the game? All progress will be lost.'
      )) {
        ObjectStorage.clear();
        window.location.reload(true);
      }
    };
    $interval($scope.saveNow, 10000);
  }]);

  app.controller('StatsController', function($scope) {
    $scope.lab = lab;
  });

  app.factory('profileService', function() {
    var saved = ObjectStorage.load('profile');
    // A returning player is anyone who has either a saved profile or any
    // progress recorded against a game object (hired workers, research
    // levels, etc.) - covers the edge case where they closed the tab right
    // after onboarding but before the profile itself got a chance to save.
    var hasProgress = saved || Object.keys(allObjects).some(function(key) {
      var state = ObjectStorage.load(key);
      return state && (state.hired > 0 || state.level > 0 || state.used > 0 || state.data > 0);
    });
    return {
      profile: saved || {
        nickname: '',
        labName: lab.state.name,
        country: '',
        currency: 'GC'
      },
      isNew: !saved,
      // Shown first, ahead of the profile modal, only for returning players.
      showContinue: !!hasProgress
    };
  });

  // Controls the profile setup modal itself. Only ever attached to that
  // one element, so it's the single source of truth for showing/hiding it.
  app.controller('ProfileController', ['profileService', '$scope', function(profileService, $scope) {
    this.profile = profileService.profile;
    this.save = function() {
      if (this.profile.labName) {
        lab.state.name = this.profile.labName;
      }
      ObjectStorage.save('profile', this.profile);
      profileService.isNew = false;
    };
    $scope.$watch(function() {
      return profileService.isNew || profileService.showContinue;
    }, function(shouldHide) {
      if (profileService.showContinue) {
        return;  // wait for the continue/restart choice first
      }
      $('#profile-modal').modal(profileService.isNew ? {show: true, backdrop: 'static', keyboard: false} : 'hide');
    });
  }]);

  // Read-only view of the profile, safe to reuse anywhere (e.g. the navbar
  // badge) without re-triggering the setup modal.
  app.controller('ProfileBadgeController', ['profileService', function(profileService) {
    this.profile = profileService.profile;
  }]);

  // Controls the "welcome back" continue/restart modal shown to returning
  // players before anything else.
  app.controller('ContinueController', ['profileService', '$scope', function(profileService, $scope) {
    this.profile = profileService.profile;
    this.continueGame = function() {
      profileService.showContinue = false;
    };
    this.restart = function() {
      if (window.confirm(
        'Do you really want to restart? All progress will be lost.'
      )) {
        ObjectStorage.clear();
        window.location.reload(true);
      }
    };
    $scope.$watch(function() {
      return profileService.showContinue;
    }, function(show) {
      $('#continue-modal').modal(show ? {show: true, backdrop: 'static', keyboard: false} : 'hide');
    });
  }]);

  analytics.init();
  analytics.sendScreen(analytics.screens.main);
})();
