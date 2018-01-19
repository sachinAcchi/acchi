function (){
  var canvas=document.getElementById('canvas'),
  context=canvas.getContext('20'),
  video=document.getElementById('video'),
  vendorUrl=window.URL||window.webkitURL;
  navigator.getmedia=navigator.getUserMedia||navigator.webkitGetUserMedia||navigator.mozGetUserMedia||navigator.msGetUserMedia;
  navigator.getMedia({video:true,audio:false},function(stream){
    video.src=vendorUrl.createObjectURL(stream);
    video.play();
  }
function(error){});
})();
