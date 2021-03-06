import _ from 'lodash'
import {
  eventsBinder,
  googleChartsLoader as loadCharts,
  makeDeferred
} from '../utils/index'

const chartDeferred = makeDeferred()

export default {
  name: 'vue-chart',
  props: ['packages','version','mapsApiKey','language','chartType','columns', 'rows','options', 'timestamp'],
  render (h) {
    const self = this
    return h('div', {class: 'vue-chart-container'}, [
      h('div', {
        attrs: {
          id: self.chartId,
          class: 'vue-chart'
        }
      })
    ])
  },
  data () {
    return {
      chart: null,
      /*
          We put the uid in the DOM element so the component can be used multiple
          times in the same view. Otherwise Google Charts will only make one chart.

          The X is prepended because there must be at least
          1 character in id - https://www.w3.org/TR/html5/dom.html#the-id-attribute
      */
      chartId: 'X' + this._uid,
      wrapper: null,
      dataTable: [],
      hiddenColumns: [],
      googleLoaded: false
    }
  },
  watch: {
    timestamp: function (newVal, oldVal) {
      if(this.googleLoaded === true) {
        if (!_.isNil(oldVal)) {
          this.drawChart()
        }       
      }
    },
    options: function (newVal, oldVal) {
      if(this.googleLoaded === true) {
        if (!_.isNil(oldVal)) {
          this.forceRedraw()
        }  
      }
    },
    chartType: function (newVal, oldVal) {
      if(this.googleLoaded === true) {
        if (!_.isNil(oldVal)) {
          this.forceRedraw()
        }  
      }
    }
  },
  events: {
    redrawChart () {
      this.drawChart()
    }
  },
  mounted () {
    let self = this
    loadCharts(self.packages, self.version, self.mapsApiKey, self.language)
      .then(() => {
        self.googleLoaded = true
        self.drawChart()
        }
    ) .catch((error) => {
        throw error
      })
  },
  methods: {
    forceRedraw () {
      this.wrapper = null
      this.chart = null
      this.drawChart()
    },
    onSelectionChanged () {
      this.$emit('onSelectionChanged', this.chart.getSelection())
    },
    /**
     * Initialize the datatable and add the initial data.
     *
     * @link https://developers.google.com/chart/interactive/docs/reference#DataTable
     * @return object
     */
    buildDataTable () {
      let self = this

      let dataTable = new google.visualization.DataTable()

      _.each(self.columns, (value) => {
        dataTable.addColumn(value)
      })

      if (!_.isEmpty(self.rows)) {
        dataTable.addRows(self.rows)
      }

      return dataTable
    },

    /**
     * Update the datatable.
     *
     * @return void
     */
    updateDataTable () {
      let self = this

      // Remove all data from the datatable.
      self.dataTable.removeRows(0, self.dataTable.getNumberOfRows())
      self.dataTable.removeColumns(0, self.dataTable.getNumberOfColumns())

      // Add
      _.each(self.columns, (value) => {
        self.dataTable.addColumn(value)
      })

      if (!_.isEmpty(self.rows)) {
        self.dataTable.addRows(self.rows)
      }
    },

    /**
     * Initialize the wrapper
     *
     * @link https://developers.google.com/chart/interactive/docs/reference#chartwrapper-class
     *
     * @return object
     */
    buildWrapper (chartType, dataTable, options, containerId) {
      let wrapper = new google.visualization.ChartWrapper({
        chartType: chartType,
        dataTable: dataTable,
        options: options,
        containerId: containerId
      })

      return wrapper
    },

    /**
     * Build the chart.
     *
     * @return void
     */
    buildChart () {
      let self = this

      // If dataTable isn't set, build it
      let dataTable = _.isEmpty(self.dataTable) ? self.buildDataTable() : self.dataTable

      self.wrapper = self.buildWrapper(self.chartType, dataTable, self.options, self.chartId)

      // Set the datatable on this instance
      self.dataTable = self.wrapper.getDataTable()

      // After chart is built, set it on this instance and resolve the promise.     
      google.visualization.events.addOneTimeListener(self.wrapper, 'ready', () => {
        self.chart = self.wrapper.getChart()
        chartDeferred.resolve()
        // binding events
        eventsBinder(self, self.chart, {'select': self.onSelectionChanged})
      })
    },

    /**
     * Draw the chart.
     *
     * @return Promise
     */
    drawChart () {
      let self = this
      // We don't have any (usable) data, or we don't have columns. We can't draw a chart without those.
      if ((!_.isEmpty(self.rows) && !_.isObjectLike(self.rows)) || _.isEmpty(self.columns)) {
        return
      }

      if (_.isNull(self.chart)) {
        // We haven't built the chart yet, so JUST. DO. IT!
        self.buildChart()
      } else {
        // Chart already exists, just update the data
        self.updateDataTable()
      }

      // Chart has been built/Data has been updated, draw the chart.
      self.wrapper.draw()

      // Return promise. Resolves when chart finishes loading.
      return chartDeferred.promise
    }
  }
}
