var lastOpened = null;

var infoTemplate = "<div class='tweet-bubble'><img src='<%= user.profile_image_url %>' alt='<%= user.username %>' align='left'/><div><strong><%= user.name %></strong><div><%= text %></div></div></div>";
var tweetTemplate = "<div class='img-col'><img src='<%= user.profile_image_url %>'/></div><div class='tweet-col'><strong><%= user.screen_name %></strong>&nbsp;<%= text %></div><div class='clear'></div>"

// Define a custom marker, if you choose.
// var markerSize = new google.maps.Size(562, 352, "px", "px");
// var scaledSize = new google.maps.Size(24, 24, "px", "px");
// var anchor     = new google.maps.Point(281, 352);
// var origin     = new google.maps.Point(0, 0);
// var markerImage = new google.maps.MarkerImage("http://cdn1.iconfinder.com/data/icons/aquaticus/60%20X%2060/twitter.png", null, null, null, scaledSize);

var Tweet = Backbone.Model.extend({
  
  position: function(){
    return new google.maps.LatLng(this.get("latlng").coordinates[1], this.get("latlng").coordinates[0]);
  }
  
});

var Tweets = Backbone.Collection.extend({
  model: Tweet
});

var TweetView = Backbone.View.extend({
  
  tagName: "li",
  
  className: "tweet",
  
  initialize: function(){
    _.bindAll(this, "render", "remove", "placeMarker", "showInfoWindow");
    this.model.bind("change", this.render);
    this.model.bind("remove", this.remove);
    this.template = _.template(tweetTemplate);
    this.infoTemplate = _.template(infoTemplate);
  },
  
  render: function(){
    $(this.el).html(this.template(this.model.toJSON())).fadeIn(200);
    return this;
  },
  
  remove: function(){
    window.lastView = this;
    $(this.el).remove();
    google.maps.event.clearListeners(this.marker);
    this.marker.setMap(null);
    this.infoWindow.close();
  },
  
  placeMarker: function(map) {
    this.marker = new google.maps.Marker({
      position: this.model.position(),
      map: map
    });

    this.infoWindow = new google.maps.InfoWindow({
      content: this.infoTemplate(this.model.toJSON())
    });

    google.maps.event.addListener(this.marker, "click", this.showInfoWindow);
    return this.marker
  }, 
  
  showInfoWindow: function(){
    if (lastOpened != null) {
      lastOpened.close();
    };
    this.infoWindow.open(map, this.marker);
    lastOpened = this.infoWindow;
  }
});

var TweetsView = Backbone.View.extend({
  el: "#tweetbar",
  initialize: function() {
    _.bindAll(this, "render", "renderTweet");
    this.collection.bind("add", this.renderTweet);
  },
  
  renderTweet: function(tweet){
    var tweetView = new TweetView({
      model: tweet
    });
    
    $("#tweetbar").prepend(tweetView.render().el);
    tweetView.placeMarker(map);
  }        
});

tweets = new Tweets();

tweets.bind("add", function(tweet){
  if (tweets.length > 25) {
    tweets.remove(tweets.first());
  };
});

function addTweet(json) {
  var tweet = new Tweet({
    text: json.text,
    latlng: json.coordinates,
    user: json.user
  });

  tweets.add(tweet);
};

function setWindowBounds () {
  var bounds = map.getBounds()
  window.slat = bounds.getSouthWest().lat();
  window.wlng = bounds.getSouthWest().lng();
  window.nlat = bounds.getNorthEast().lat();
  window.elng = bounds.getNorthEast().lng();
}

function withinMapView(coordinates) {
  if (coordinates[1] > window.slat && coordinates[1] < window.nlat && coordinates[0] > window.wlng && coordinates[0] < window.elng) {
    return true
  } else {
    return false
  };
};

$(function(){
  window.map = new google.maps.Map(document.getElementById("map"), {
    center: new google.maps.LatLng(30.284540, -97.7933959),
    zoom: 4,
    mapTypeId: google.maps.MapTypeId.ROADMAP
    });

  google.maps.event.addListener(window.map, "dragend", setWindowBounds);
  google.maps.event.addListener(window.map, "bounds_changed", setWindowBounds);

  window.ws = new WebSocket("ws://107.20.197.33:8080")

  ws.onmessage = function(msg) {

    var json = JSON.parse(msg.data);
    
    if (json.coordinates !== undefined && json.coordinates !== null && json.coordinates.type === "Point") {

      if (withinMapView(json.coordinates.coordinates)) {
        addTweet(json);
      }
    }
  };
  
  window.tweetsView = new TweetsView({
    collection: tweets
  });
  
  // tweetsView.render();
  
});