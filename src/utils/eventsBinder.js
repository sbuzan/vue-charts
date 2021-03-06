import _ from 'lodash'

export function eventsBinder (vue, googleChart, events) {
  // Loop through our events, create a listener for them, and
  // attach our callback function to that event.
  for (let event in events) {
    let eventName = event
    let eventCallback = events[event]

    if (eventName === 'ready') {
      // The chart is already ready, so this event missed it's chance.
      // We'll call it manually.
      eventCallback()
    } else if (!_.isNil(googleChart) && !_.isNil(eventName) && !_.isNil(eventCallback)) {
      google.visualization.events.addListener(googleChart, eventName, eventCallback)
    }
    else {
      console.log('cannot bind event', googleChart, eventName, eventCallback)
    }
  }
}

export default eventsBinder
