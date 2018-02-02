/**
 * This module serves as the router to the different views. It handles
 * any incoming requests.
 *
 * @param app An express object that handles our requests/responses
 * @param socketIoServer The host address of this server to be injected in the views for the socketio communication
 */

'use strict';


module.exports=function(app, socketIoServer) {
    app.get('/',function(req,res){
        res.render('home');
    });

    var chatRoom = {
      'name': 'test',
      'presenter': 'pradeep'
    }

    app.get('/:path',function(req,res){
      var path = req.params.path;
      console.log("get params");
      var userID = req.query.userID;
      console.log(path);
      console.log("Requested room "+path);
      console.log("presenter " + chatRoom.presenter);
      if (chatRoom.name == path) {
        res.render('room', {"hostAddress":socketIoServer , 'userID':userID , 'presenter': chatRoom.presenter});
      }else{
        res.render('invalidRoom');
      }



    });

}
