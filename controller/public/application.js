var App = function(lat, lng) {
  this.init = function() {
    function initMap(){
      this.map = new google.maps.Map(document.getElementById('map'), {
        center: {lat: lat, lng: lng},
        zoom: 16
      });
    }

    initMap.bind(this)();
    this.listenToMapChange();
    this.listenToCitySelect();
    this.listenToAddress();
    this.listenToLocation();
    this.listenToKeyPress();

    $('#walking-arround').click(function(){
      this.walkingAround();
    }.bind(this));    

    $('#stop-walking').click(function(){
      this.stopWalking();
    }.bind(this));    
  };

  this.currWalkingSteps = 0;
  this.currWalkingInstance = null;
  this.currWalkingInstanceMarker = null;
  this.totalWalkingDistance = 0;
  this.map = null;
  this.currLocation = {
    lat: lat,
    lng: lng
  };

  this.getCurrentLocation = function() {
    return this.currLocation;
  };

  this.getLocationByAddress = function(address, callback) {
    $.ajax({
      type : "GET",
      url : "https://maps.googleapis.com/maps/api/geocode/json?address="+address.replace(/ /g, "+"),
      dataType : "JSON",
      success: function(data){
        callback(data.results[0].geometry.location);
      }
    });
  }

  this.getAddressByLocation = function(loc, callback) {
    $.ajax({
      type : "GET",
      url : "https://maps.googleapis.com/maps/api/geocode/json?latlng="+loc+"&sensor=true",
      dataType : "JSON",
      success: function(data){
        callback(data.results[0].formatted_address);
      }
    });
  }

  this.locationToString = function() {
    return this.currLocation.lat + ',' + this.currLocation.lng;
  }

  this.updateGPSStorage = function(location) {
    this.currLocation = {lat: location.lat, lng: location.lng};
  };

  this.updateFrontEnd = function() {
    function updateMap(location){
      this.map.setCenter(location);
    }

    this.getAddressByLocation(this.locationToString(), function(address){
      $("#address").val(address);
    });

    $("#latitude").val(this.currLocation.lat);
    $("#longitude").val(this.currLocation.lng);
    $("#location").val(this.currLocation.lat + ", " + this.currLocation.lng);

    updateMap.bind(this)(this.currLocation);
  };

  this.updateGPX = function() {
    $.ajax({
      type : "POST",
      url : "/update",
      data : {
        lat: this.currLocation.lat,
        lon: this.currLocation.lng
      },
      dataType : "JSON"
    });
    // The following is for updating the pokemon locations
  };

  this.setNewLocation = function(location) {
    this.updateGPSStorage(location);
    this.updateFrontEnd();
    this.updateGPX();
  };

  this.walkingToDestination = function(origin, destination) {
    // Latitude: 1 deg = 110.574 km
    // Longitude: 1 deg = 111.320*cos(latitude) km

    // reset if another destination is chosen
    clearInterval(this.currWalkingInstance);

    // reset if another destination is chosen
    if (this.currWalkingInstanceMarker) {
      this.currWalkingInstanceMarker.setMap(null);
    }

    // set marker
    this.currWalkingInstanceMarker = new google.maps.Marker({
      position: destination,
      map: this.map,
      title: 'Destination'
    });

    // calculate coordinates differences
    var latDiff = destination.lat() - origin.lat();
    var lngDiff = destination.lng() - origin.lng();

    // calculate distance in meters using google maps api
    // assume you can run 5 m/s, that's 18km/hr, pretty fast but reasonable
    var service = new google.maps.DistanceMatrixService();
    service.getDistanceMatrix({
      origins: [origin],
      destinations: [destination],
      travelMode: google.maps.TravelMode.WALKING
    }, function(response) {
      var results = response.rows[0].elements;
      var plannedDistance = results[0].distance.value;
      var steps = plannedDistance / 5

      var latPerStep = latDiff / steps;
      var lngPerStep = lngDiff / steps;

      this.currWalkingSteps = 0;

      this.currWalkingInstance = setInterval(function() {
        this.totalWalkingDistance += 5;
        this.currWalkingSteps++;

        this.currLocation = {
          lat: this.currLocation.lat + latPerStep,
          lng: this.currLocation.lng + lngPerStep
        };

        this.setNewLocation(this.currLocation);

        if (this.currWalkingSteps > steps) {
          clearInterval(this.currWalkingInstance);
          this.currWalkingInstanceMarker.setMap(null);
        }
      }.bind(this), 2000); // 10 m/s
    }.bind(this));
  };

  this.walkingAround = function(origin) {
    
    // Latitude: 1 deg = 110.574 km
    // Longitude: 1 deg = 111.320*cos(latitude) km

    // reset if another destination is chosen
    clearInterval(this.currWalkingInstance);

    // reset if another destination is chosen
    if (this.currWalkingInstanceMarker) {
      this.currWalkingInstanceMarker.setMap(null);
    }

    // set marker
    this.currWalkingInstanceMarker = new google.maps.Marker({
      position: origin,
      map: this.map,
      title: 'origin'
    });


    var direction = 1;

    var latPerStep = Math.random() / 10000;
    var lngPerStep = Math.random() / 10000;

    this.currWalkingInstance = setInterval(function() {
      this.currLocation = {
        lat: this.currLocation.lat + (latPerStep * direction),
        lng: this.currLocation.lng + (lngPerStep * direction)
      };

      this.setNewLocation(this.currLocation);

      if(direction != 1){
          latPerStep = (Math.random() / 10000) ;
          lngPerStep = (Math.random() / 10000) ;
      }

      direction = direction * -1;

    }.bind(this), 2000); // 10 m/s



  };

  this.stopWalking = function() {
    clearInterval(this.currWalkingInstance);

    if (this.currWalkingInstanceMarker) {
      this.currWalkingInstanceMarker.setMap(null);
    }
  };

  this.listenToMapChange = function() {
    this.map.addListener('mouseup', function() {
      this.setNewLocation({lat: this.map.getCenter().lat(), lng: this.map.getCenter().lng()});
    }.bind(this));

    this.map.addListener('click', function(event) {
      this.walkingToDestination(this.map.getCenter(), event.latLng);
    }.bind(this));
  };

  this.listenToCitySelect = function() {
    $("#location-change-button").click(function(){
      var context = this;
      this.getLocationByAddress($('#location-select').val(), function(result){
        context.setNewLocation(result);
      });
    }.bind(this));
  };

  this.listenToAddress = function() {
    $("#address-button").click(function(){
      var context = this;
      this.getLocationByAddress($('#address').val(), function(result){
        context.setNewLocation(result);
      });
    }.bind(this));
  };

  this.listenToLocation = function() {
    $("#location-button").click(function(){
      this.setNewLocation({lat:parseFloat($('#latitude').val()), lng:parseFloat($('#longitude').val())});
    }.bind(this));

    $("#position-button").click(function(){
      var pos = $('#location').val().split(",");

      if(pos.length == 2){
        this.setNewLocation({lat:parseFloat(pos[0]), lng:parseFloat(pos[1])});
      }
      
    }.bind(this));

  };

  this.listenToKeyPress = function() {
    function changeCurrentLocationOnKey(direction, location) {
      var newLocation;

      function moveInterval() {
        var randomNum = parseInt(10 * Math.random());
        var number = "0.000" + (100 + randomNum);
        return parseFloat(number);
      }

      if (direction == "left") {
        location.lng -= moveInterval();
      } else if (direction == "right") {
        location.lng += moveInterval();
      } else if (direction == "up") {
        location.lat += moveInterval();
      }  else if (direction == "down") {
        location.lat -= moveInterval();
      }

      return {lat: location.lat, lng: location.lng};
    }

    $(document).keyup(function(e){
      var direction = "";
      switch (e.keyCode) {
        case 38:
          direction = "up";
          break;
        case 40:
          direction = "down";
          break;
        case 37:
          direction = "left";
          break;
        case 39:
          direction = "right";
          break;
      }
      
      if(direction !== "") {
        this.currLocation = changeCurrentLocationOnKey(direction, this.currLocation);
        this.setNewLocation(this.currLocation);
      }
    }.bind(this));
  };

  this.init();
};

$('document').ready(function() {
  var START_LATITUDE = "25.0404479";
  var START_LONGTITUDE = "121.5308759";
  $("#latitude").val(START_LATITUDE);
  $("#longitude").val(START_LONGTITUDE);
  $("#location").val(START_LATITUDE + ", " + START_LONGTITUDE);
  //$("#address").val("Enter address here...");
  var app = new App(parseFloat(START_LATITUDE), parseFloat(START_LONGTITUDE));
})

