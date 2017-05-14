/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 * @flow
 */

import React, { Component } from 'react';
import {
  AppRegistry,
  StyleSheet,
  Text,
  View,
  Dimensions
} from 'react-native';

import MapView from 'react-native-maps';
import Tts from 'react-native-tts';

// const { width, height } = Dimensions.get('window');
// const SCREEN_HEIGHT = height;
// const SCREEN_WIDTH = width;
// // const ASPECT_RATIO = width / height;
// const LATITUDE_DELTA = 0.0922;
// const LONGITUDE_DELTA = LATITUDE_DELTA * ASPECT_RATIO;


if (!window.location) {
    // App is running in simulator
    window.navigator.userAgent = 'ReactNative';
}

// This must be below your `window.navigator` hack above
const io = require('socket.io-client');

class DistValue extends Component {
    render() {
      const { id } = this.props;
      const { value } = this.props;
      return(
        <Text>
          <Text style={styles.title}>Sensor {id}: </Text>
          {value}cm
        </Text>
      );
    }
}

export default class blindly extends Component {
  constructor(props) {
    super(props);
    this.state = {
      usonic: {
        dist1: '-',
        dist2: '-',
        dist3: '-',
      },
      streetAddress: 'desconocido',
      currentRegion: {
        latitude: 0,
        longitude: 0,
        latitudeDelta: 0,
        longitudeDelta: 0,
      },
      markerPosition: {
        latitude: 0,
        longitude: 0
      }
    };

  }

  watchID: ?number = null

  getAddress = (lat, long) => {
    //https://maps.googleapis.com/maps/api/geocode/json?latlng=19.28992168,-99.04402069&key=AIzaSyAp8XTbEvRufK52nDfWJFey6Jd3o_nGWtA
    const params = `latlng=${lat},${long}&key=AIzaSyAp8XTbEvRufK52nDfWJFey6Jd3o_nGWtA`;
    fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?${params}`,
    )
    .then((response) => response.json())
    .then((responseJson) => {
      const result = responseJson.results[0];
      let streetAddress = {};
      result.address_components.forEach((component) => {
        if(component.types.indexOf('route') != -1) {
          streetAddress.route = component.long_name;
        }
        if(component.types.indexOf('street_number') != -1) {
          streetAddress.streetNumber = component.long_name;
        }
        if(component.types.indexOf('political') != -1 && component.types.indexOf('sublocality') != -1) {
          streetAddress.sublocality = component.long_name;
        }
      });
      const addr = `${streetAddress.route} ${streetAddress.streetNumber}, ${streetAddress.sublocality}`;
      Tts.speak(addr);
      this.setState({streetAddress: addr});
    })
    .catch((error) => {console.error(error)});
  }

  getPosition = () =>{
    navigator.geolocation.getCurrentPosition((position) => {
      const lat = parseFloat(position.coords.latitude);
      const long = parseFloat(position.coords.longitude);

      this.setState({initPosStr: JSON.stringify(position)});

      const initialRegion = {
        latitude: lat,
        longitude: long,
        latitudeDelta: 0.015,
        longitudeDelta: 0.0121,
      }

      this.setState({currentRegion: initialRegion});
      this.setState({markerPosition: initialRegion});
      this.getAddress(lat,long);
    },
    (error) => console.log(JSON.stringify(error)),
    {enableHighAccuracy: true, timeout: 20000, maximumAge: 1000});
  }

  componentDidMount(){
    this.socket = io('http://10.10.1.1:3000/sensors', { transports: ['websocket']});
    this.socket.emit('join-alerts');
    this.socket.on('right-alert', (msg) => {
      Tts.speak(msg.message);
      this.setState({ dist1: msg.message });
    });
    this.socket.on('center-alert', (msg) => {
      Tts.speak(msg.message);
      this.setState({ dist2: msg.message });
    });
    this.socket.on('left-alert', (msg) => {
      Tts.speak(msg.message);
      this.setState({ dist3: msg.message });
    });
    this.socket.emit('join-position-request');
    this.socket.on('position-request', (value) => {
      if(value) {
        this.getPosition();
      }
    });

    this.getPosition();

    this.watchID = navigator.geolocation.watchPosition((position) => {
      const lat = parseFloat(position.coords.latitude);
      const long = parseFloat(position.coords.longitude);

      this.setState({currPosStr: JSON.stringify(position)});
      var lastRegion = {
        latitude: lat,
        longitude: long,
        latitudeDelta: 0.015,
        longitudeDelta: 0.0121,
      }

      this.setState({currentRegion: lastRegion});
      this.setState({markerPosition: lastRegion});
      this.getAddress(lat,long);
    },
    (error) => console.log(JSON.stringify(error)),
    {enableHighAccuracy: true, timeout: 20000, maximumAge: 1000});
  }

  componentWillUnmount(){
    navigator.geolocation.clearWatch(this.watchID)
  }

  render() {
    return (
      <View style={styles.container}>
        <MapView
          style={styles.map}
          region={this.state.currentRegion}
          >
            <MapView.Marker
                  coordinate={this.state.markerPosition}
                  title="Posición Actual"
                />
        </MapView>
        <Text style={styles.title}>
            <Text style={{fontWeight: '700'}}>Dirección: </Text>
            {this.state.streetAddress}
        </Text>
      </View>
    );
  }
}
{/* <DistValue id={1} value={this.state.usonic.dist1} />
<DistValue id={2} value={this.state.usonic.dist2} />
<DistValue id={3} value={this.state.usonic.dist3} /> */}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'flex-start',
    alignItems: 'center',
    flex: 1,
  },
  map: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  title: {
    fontSize: 16,
    backgroundColor: 'powderblue',
  },
  radius: {
    height: 50,
    width: 50,
    borderRadius: 50 / 2,
    overflow: 'hidden',
    backgroundColor: 'rgba(0, 122, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(0, 112, 255, 0.3)',
    alignItems: 'center',
    justifyContent: 'center'
  },
  marker: {
    height: 20,
    width: 20,
    borderWidth: 3,
    borderColor: 'white',
    borderRadius: 20/2,
    overflow: 'hidden',
    backgroundColor: '#007AFF'
  }
});

AppRegistry.registerComponent('blindly', () => blindly);
