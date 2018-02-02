'use strict';

var meeting;
var host = HOST_ADDRESS; // HOST_ADDRESS gets injected into room.ejs from the server side when it is rendered
var PRESENTING = false
if (PRESENTER_ID == USER_ID) {
  PRESENTING = true
}

function addRemoteVideo(stream, participantID) {

  $('.videoWrap').remove();

  var $videoBox = $("<div class='videoWrap' style='height:100vh;padding:0px;margin:0px;background-color:black;' id='" + participantID + "'></div>");
  var $video = $("<video class='videoBox' autoplay></video>");
  $video.attr({
    "src": window.URL.createObjectURL(stream),
    "autoplay": "autoplay"
  });
  $videoBox.append($video);
  $("#videosWrapper").append($videoBox);
}


function addRemoteVideoSm(stream, participantID) {

  var $videoBox = $("<div class='videoWrapSm' style='width:100%;padding:0px;margin:0px;' id=smv'"  + participantID + "'></div>");
  var $video = $("<video class='videoBox' autoplay></video>");
  $video.attr({
    "src": window.URL.createObjectURL(stream),
    "autoplay": "autoplay"
  });
  $videoBox.append($video);

  // console.log($("#sm" + participantID ));
  $("#sm" + participantID ).empty()
  $("#sm" + participantID ).append($videoBox);
}


var app = angular.module('app', ['ngSanitize', 'ui.bootstrap']);

app.directive('ngEnter', function() {
  return function(scope, element, attrs) {
    element.bind("keydown keypress", function(event) {
      if (event.which === 13) {
        scope.$apply(function() {
          scope.$eval(attrs.ngEnter);
        });
        event.preventDefault();
      }
    });
  };
});


app.controller('main', function($scope, $sce, $timeout, $uibModal, $interval) {

  $scope.meeting = new Meeting(host);

  // var screen = new Screen($scope.meeting.id);
  //
  // // get shared screens
  // screen.onaddstream = function(e) {
  //     document.body.appendChild(e.video);
  // };
  //
  // screen.check();
  // screen.share('screen name');

  $scope.changeRecorderStream = function(stream) {
    var tracks = $scope.recorderStream.getTracks();
    for (var i = 0; i < tracks.length; i++) {
      $scope.recorderStream.removeTrack(tracks[i]);
    }

    var tracks = stream.getTracks();

    for (var i = 0; i < tracks.length; i++) {
      $scope.recorderStream.addTrack(tracks[i])
    }
  }


  $scope.sendMessage = function(){
    if ($scope.message.text.length ==0) {
      return;
    }
    var msgToSend = {text : $scope.message.text , sender : $scope.user.name , time : new Date(), senderID : $scope.meeting.id}

    $scope.meeting.sendChatMessage({
      type: 'message' , msg : msgToSend});
    $scope.data.messages.push(msgToSend);
    $scope.message = {text : ''};
  }


  $scope.meeting.onLocalVideo(function(stream) {
    $scope.localStream = stream;

    $scope.recorderStream = stream.clone();

    // $scope.changeRecorderStream(stream);

    $scope.mediaRecorder = new MediaStreamRecorder($scope.recorderStream);
    $scope.mediaRecorder.mimeType = 'video/mp4';
    $scope.mediaRecorder.ondataavailable = function (blob) {
        console.log(blob);
        // POST/PUT "Blob" using FormData/XHR2
        // var blobURL = URL.createObjectURL(blob);
        // document.write('<a href="' + blobURL + '">' + blobURL + '</a>');
    };
    // $scope.mediaRecorder.start(1000);


  });

  $scope.message = {text : ''};

  $scope.mediaStreams = {};

  $scope.meeting.onRemoteVideo(function(stream, participantID) {

    // from the presenter

    $scope.mediaStreams[participantID] = stream;
    // addRemoteVideo(stream, participantID);
  });

  $scope.meeting.onChatReady(function() {
    console.log("Chat is ready");
    console.log($scope.meeting);
    $scope.meeting.sendChatMessage({
      type: 'userInfoRequest'
    });
  });

  $scope.meeting.onChatNotReady(function() {
    console.log("Chat is not ready");
  });

  $scope.heartBeatResponses = []
  $scope.screenMode = 'details';

  $scope.meeting.onChatMessage(function(d) {
    // handle the chat message
    var msg = JSON.parse(d)
    if (msg.type == 'userInfoRequest') {
      $scope.meeting.sendChatMessage({
        type: 'userInfoReply',
        user: $scope.user
      });
    } else if (msg.type == 'userInfoReply' && msg.user.id != $scope.meeting.id) {

      if (document.getElementById(msg.user.id) && !msg.user.video) {
        $('.videoWrap').remove();
        $scope.screenMode = 'waiting';
        $scope.$apply();
      }


      if ($scope.user.presenting && msg.user.presenting) {
        $scope.meeting.sendChatMessageToUser({
          type: 'stopPresenting'
        }, msg.user.id);
      }

      var alreadyKnwon = false;
      for (var i = 0; i < $scope.users.length; i++) {
        if($scope.users[i].id == msg.user.id){
          alreadyKnwon = true;
          $scope.users[i] = msg.user;
        }
      }


      if (!alreadyKnwon){
        $scope.users.push(msg.user);

        for (var i = 0; i < $scope.users.length; i++) {
          if (msg.user.name == $scope.users[i].name) {
            $scope.heartBeatResponses.push({id : $scope.users[i].id , sent : true , received : false , time : new Date()});

            $scope.meeting.sendChatMessageToUser({
              type: 'heartBeatRequest',
              from : $scope.user.id
            }, $scope.users[i].id);

          }
        }
      }

      // update the video stream positions
      $('.videoWrap').remove();
      for (var i = 0; i < $scope.users.length; i++) {
        if ($scope.users[i].presenting) {
          $scope.screenMode = 'stream';
          $scope.$apply();
          addRemoteVideo($scope.mediaStreams[$scope.users[i].id] , $scope.users[i].id)
          $scope.changeRecorderStream($scope.mediaStreams[$scope.users[i].id]);
        }

      }
      if ($scope.users.length == 1 && $scope.users[0].video) {
        $scope.screenMode = 'stream';
        $scope.$apply();
        addRemoteVideo($scope.mediaStreams[$scope.users[0].id] , $scope.users[0].id)
        $scope.changeRecorderStream($scope.mediaStreams[$scope.users[0].id]);
      }
      $scope.renderFilms();

    }else if (msg.type == 'message' ) {
      $scope.data.messages.push(msg.msg);
      if ($scope.active != 'chat') {
        $scope.data.unreadCount += 1;
      }
    }else if (msg.type == 'heartBeatRequest') {
      $scope.meeting.sendChatMessageToUser({
        type: 'heartBeatResponse',
        from : $scope.user.id
      }, msg.from);
    }else if (msg.type == 'heartBeatResponse') {
      for (var i = 0; i < $scope.heartBeatResponses.length; i++) {
        if($scope.heartBeatResponses[i].id == msg.from){
          $scope.heartBeatResponses.splice(i,1);
          break;
        }
      }
    } else if (msg.type == 'present') {
      $scope.user.presenting = true;
      $scope.sendMyInfo();
    }else if (msg.type == 'stopPresenting') {
      $scope.user.presenting = false;
      $scope.sendMyInfo();
    }else if (msg.type == 'mute') {
      $scope.user.mic = false;
      $scope.user.mute = true;
      $scope.sendMyInfo();
    }
    $scope.$apply();
  })


  $scope.sendMyInfo = function() {
    $scope.meeting.sendChatMessage({
      type: 'userInfoReply',
      user: $scope.user
    });
  }

  $scope.meeting.onParticipantHangup(function(from) {
    for (var i = 0; i < $scope.users.length; i++) {
      if ($scope.users[i].id == from) {
        $scope.users.splice(i,1);
        if (document.getElementById(from)) {
          $('.videoWrap').remove();
        }
        return;
      }
    }
  });


  $interval(function() {
    for (var i = 0; i < $scope.heartBeatResponses.length; i++) {
      if ((new Date() - $scope.heartBeatResponses[i].time)>7000) {
        for (var i = 0; i < $scope.users.length; i++) {
          if ($scope.users[i].id == $scope.heartBeatResponses[i].id) {
            $scope.users.splice(i , 1);
            break;
          }
        }
      }
    }
  }, 5000);

  $scope.room = window.location.pathname.match(/([^\/]*)\/*$/)[1];
  $scope.meeting.joinRoom($scope.room);



  $scope.user = {
    name: 'Unknown',
    email: 'unknown@cioc.co.in',
    id: $scope.meeting.id,
    mic : false,
    video : false,
    'screen' : false,
    admin : false,
    presenting: false
  }

  if (PRESENTING) {
    $scope.user.presenting = true;
    $scope.user.admin = true;
  }


  if (typeof $.cookie("name") == 'undefined') {
    var modalInstance = $uibModal.open({
      templateUrl: '/ngTemplates/app.webConnect.name.html',
      resolve: {
        user: function() {
          return $scope.user;
        }
      },
      backdrop: 'static',
      controller: function($scope, $uibModalInstance, user) {
        user.name = '';
        user.email = '';

        $scope.user = user;
        $scope.close = function() {
          $uibModalInstance.close();
        }
      },
      size: 'sm',
    });

    modalInstance.result.then(function() {
      console.log("Should tell everybody my name");
      if ($scope.user.name != '' || $scope.user.email != '') {
        $scope.meeting.sendChatMessage({
          type: 'userInfoReply',
          user: $scope.user
        });
        $.cookie("name" , $scope.user.name)
        $.cookie("email" , $scope.user.email)
      }

    })
  }else{
    $scope.user.name = $.cookie("name");
    $scope.user.email = $.cookie("email");
  }

  $scope.recordMode = 'play';

  $scope.toggleRecorder = function() {
    if ($scope.recordMode == 'play') {
      $scope.mediaRecorder.start(5*1000);;
      $scope.recordMode = 'pause';
    }else if($scope.recordMode == 'pause'){
      $scope.recordMode = 'resume';
      $scope.mediaRecorder.pause();
    }else if($scope.recordMode == 'resume'){
      $scope.recordMode = 'pause';
      $scope.mediaRecorder.resume();
    }
  }

  $scope.saveRecording = function() {
    $scope.recordMode = 'play';
    $scope.mediaRecorder.save();
    $scope.mediaRecorder.clearOldRecordedFrames();
  }

  $scope.users = [];

  $scope.active = 'users';

  $scope.data = {messages : [] , unreadCount : 0};

  $scope.changeContentTab = function(tab) {
    $scope.active = tab;
    if (tab == 'settings') {
      $timeout(function() {
        if (document.getElementById('localVideo')) {
          document.getElementById('localVideo').src = window.URL.createObjectURL($scope.localStream)
        }
      }, 1000);
    }else if (tab == 'chat'){
      $scope.data.unreadCount = 0;
    }else if (tab == 'film') {
      $scope.renderFilms();

    }
  }

  $scope.renderFilms = function() {
    if ($scope.active != 'film') {
      return;
    }
    $timeout(function() {
      $scope.$apply();
      for (var i = 0; i < $scope.users.length; i++) {
        addRemoteVideoSm($scope.mediaStreams[$scope.users[i].id] , $scope.users[i].id)
      }
    }, 1500)
  }

  $scope.revokePresentor = function() {
    for (var i = 0; i < $scope.users.length; i++) {
      if ($scope.users[i].presenting) {
        $scope.meeting.sendChatMessageToUser({
          type: 'stopPresenting'
        }, $scope.users[i].id);
      }
    }
  }

  $scope.muteAll = function() {

    $scope.meeting.sendChatMessage({
      type: 'mute',
    });
    $scope.sendMyInfo();
  }

  $scope.userOption = function(index, option) {
    console.log(index + " " + option);
    if ($scope.user.admin) {
      $scope.revokePresentor();
      $scope.user.presenting = false;
      if (option == 'makePresenter' && !$scope.users[index].presenting) {
        $scope.meeting.sendChatMessageToUser({
          type: 'present'
        }, $scope.users[index].id);
        $scope.sendMyInfo();
      }
    }
  }

  $scope.present = function() {
    $scope.revokePresentor();
    $scope.user.presenting = true;
    $scope.sendMyInfo();
  }

  $scope.toggle = function(item) {

    if (item == 'mic') {
      $scope.user.mic = !$scope.user.mic;
      $scope.meeting.toggleMic();
    } else if (item == 'screen') {
      $scope.user.screen = !$scope.user.screen;
    } else if (item == 'video') {
      $scope.meeting.toggleVideo();
      $scope.user.video = !$scope.user.video;
    }
    $scope.sendMyInfo();
  }

  $scope.enterFullScreen = function() {
    var elem = $(".videoBox")[0];
    if (elem.requestFullscreen) {
      elem.requestFullscreen();
    } else if (elem.msRequestFullscreen) {
      elem.msRequestFullscreen();
    } else if (elem.mozRequestFullScreen) {
      elem.mozRequestFullScreen();
    } else if (elem.webkitRequestFullscreen) {
      elem.webkitRequestFullscreen();
    }
  }


  // $scope.meeting.toggleMic();

})
