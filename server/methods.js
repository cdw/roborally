Meteor.methods({
  createGame: function(postAttributes) {
    var user = Meteor.user(),
    gameWithSameName = Games.findOne({name: postAttributes.name});

    // ensure the user is logged in
    if (!user)
      throw new Meteor.Error(401, "You need to login to post new stories");
    // check that there are no previous posts with the same link
    if (postAttributes.name && gameWithSameName) {
      throw new Meteor.Error(302,  gameWithSameName._id);
    }
    if (!postAttributes.name || postAttributes.name === '') {
      throw new Meteor.Error(303, 'Name cannot be empty.');
    }
    var author = (user.profile) ? user.profile.name : user.emails[0].address;
    // pick out the whitelisted keys
    var game = _.extend(_.pick(postAttributes, 'name'), {
      userId: user._id,
      author: author,
      submitted: new Date().getTime(),
      players: [],
      started: false
    });
    var gameId = Games.insert(game);

    // analytics.track(user._id, 'Game created', {
    //   id: gameId,
    //   name: game.name,
    //   user: author
    // });

    return gameId;
  },

  joinGame: function(gameId) {
    var user = Meteor.user();

    if (!user)
      throw new Meteor.Error(401, "You need to login to join a game");
    var game = Games.findOne(gameId);
    if (!game)
      throw new Meteor.Error(401, "Game id not found!");

    var author = (user.profile) ? user.profile.name : user.emails[0].address;
    console.log('User ' + author + ' joining game ' + gameId);

    var players = game.players;
    players.push({userId: user._id, author: author});
    Games.update(gameId, {$set: {players: players}});

    // analytics.track('Game joined', {
    //   id: gameId,
    //   name: game.name,
    //   user: author
    // });
  },

  leaveGame: function(postAttributes) {
    var user = Meteor.user();
    if (postAttributes.user) {
      user = postAttributes.user;
    }

    if (!user)
      throw new Meteor.Error(401, "You need to login to leave a game");
    var game = Games.findOne(postAttributes.gameId);
    if (!game)
      throw new Meteor.Error(401, "Game id not found!");

    var author = (user.profile) ? user.profile.name : user.emails[0].address;
    console.log('User ' + author + ' leaving game ' + postAttributes.gameId);

    var players = _.reject(game.players, function(el) {
      return el.userId == user._id;
    });
    Games.update(postAttributes.gameId, {$set: {players: players}});

    // analytics.track('Left game', {
    //   id: postAttributes.gameId,
    //   user: author
    // });
  },

  startGame: function(gameId) {
    var game = Games.findOne(gameId);
    if (game.players.length != 2) {
      throw new Meteor.Error(401, "Need exactly 2 players to start the game");
    }
    Games.update(gameId, {$set: {started: true}});

    for (var i in game.players) {
      GameLogic.updatePosition(gameId, i, GameLogic.DEFAULT_X, GameLogic.DEFAULT_Y, GameLogic.DEFAULT_DIRECTION);
      GameLogic.drawCards(gameId, i);
    }

    // analytics.track('Game started', {
    //   id: gameId,
    //   name: game.name
    // });
  },

  playCards: function(attributes) {
    var game = Games.findOne(attributes.gameId);
    if (!game)
      throw new Meteor.Error(401, 'Game not found! ' + attributes.gameId);
    for (var i in game.players) {
      if (game.players[i].userId == Meteor.userId()) {
        GameLogic.playCards(attributes.gameId, i, attributes.cards);
        break;
      }
    }
  }
});