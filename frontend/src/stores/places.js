import { defineStore } from 'pinia'
import { getPlaces, getCityDetail, addCity, updateCity, deleteCity, getJourneys, addJourney, updateJourney, deleteJourney } from '../api'

export const usePlacesStore = defineStore('places', {
  state: () => ({
    provinces: [],
    cities: [],
    journeys: [],
    selectedCity: null,
    cityPhotos: [],
    selectedJourney: null,
    loading: false
  }),

  getters: {
    visitedProvinces: (state) => state.provinces.filter(p => p.visited_at),
    visitedProvinceCodes: (state) => state.provinces.filter(p => p.visited_at).map(p => p.code),
    hasCities: (state) => state.cities.length > 0
  },

  actions: {
    async fetchPlaces() {
      this.loading = true
      try {
        const { data } = await getPlaces()
        this.provinces = data.provinces
        this.cities = data.cities
      } finally {
        this.loading = false
      }
    },

    async selectCity(id) {
      this.loading = true
      try {
        const { data } = await getCityDetail(id)
        this.selectedCity = data.city
        this.cityPhotos = data.photos
      } finally {
        this.loading = false
      }
    },

    clearSelection() {
      this.selectedCity = null
      this.cityPhotos = []
    },

    async addCity(cityData) {
      const { data } = await addCity(cityData)
      await this.fetchPlaces()
      return data.id
    },

    async updateCity(id, cityData) {
      await updateCity(id, cityData)
      await this.fetchPlaces()
    },

    async deleteCity(id) {
      await deleteCity(id)
      this.clearSelection()
      await this.fetchPlaces()
    },

    async fetchJourneys() {
      const { data } = await getJourneys()
      this.journeys = data.journeys
    },

    async selectJourney(id) {
      this.selectedJourney = this.journeys.find(j => j.id === id) || null
    },

    clearJourneySelection() {
      this.selectedJourney = null
    },

    async addJourney(journeyData) {
      const { data } = await addJourney(journeyData)
      await this.fetchJourneys()
      return data.id
    },

    async updateJourney(id, journeyData) {
      await updateJourney(id, journeyData)
      await this.fetchJourneys()
    },

    async deleteJourney(id) {
      await deleteJourney(id)
      this.clearJourneySelection()
      await this.fetchJourneys()
    }
  }
})