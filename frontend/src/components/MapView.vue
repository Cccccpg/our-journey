<template>
  <div class="map-container" ref="mapRef"></div>
</template>

<script setup>
import { ref, onMounted, watch, computed } from 'vue'
import * as echarts from 'echarts'
import { usePlacesStore } from '../stores/places'
import { useEditStore } from '../stores/edit'
import { useThemeStore } from '../stores/theme'

const emit = defineEmits(['selectCity', 'addCity'])

const mapRef = ref(null)
const chart = ref(null)
const placesStore = usePlacesStore()
const editStore = useEditStore()
const themeStore = useThemeStore()

onMounted(async () => {
  // 注册中国地图
  try {
    const response = await fetch('/china.json')
    const geoJson = await response.json()
    echarts.registerMap('china', geoJson)
  } catch {
    console.warn('地图数据加载失败，使用简化版本')
  }

  initChart()
})

const initChart = () => {
  if (!mapRef.value) return

  chart.value = echarts.init(mapRef.value, null, {
    renderer: 'canvas'
  })

  const option = {
    backgroundColor: 'transparent',
    geo: {
      map: 'china',
      roam: true,
      zoom: 1.2,
      center: [104, 36],
      label: {
        show: false
      },
      emphasis: {
        label: {
          show: true,
          color: '#333'
        },
        itemStyle: {
          areaColor: themeStore.activeTheme?.primary_color || '#E8B4B8'
        }
      },
      itemStyle: {
        areaColor: '#F0EDE5',
        borderColor: '#D0C8B8',
        borderWidth: 1
      },
      regions: []
    },
    series: [
      {
        type: 'effectScatter',
        coordinateSystem: 'geo',
        data: [],
        symbolSize: 14,
        symbol: 'path://M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z',
        symbolOffset: [0, 0],
        rippleEffect: {
          brushType: 'stroke',
          scale: 3,
          period: 4
        },
        itemStyle: {
          color: themeStore.activeTheme?.accent_color || '#FF6B6B',
          shadowBlur: 10,
          shadowColor: themeStore.activeTheme?.accent_color || '#FF6B6B'
        },
        label: {
          show: true,
          position: 'right',
          formatter: '{b}',
          fontSize: 12,
          color: '#333'
        },
        emphasis: {
          itemStyle: {
            color: themeStore.activeTheme?.accent_color || '#FF6B6B'
          }
        }
      }
    ]
  }

  chart.value.setOption(option)

  // 点击事件
  chart.value.on('click', (params) => {
    if (params.seriesType === 'effectScatter') {
      // 点击城市标记
      const city = placesStore.cities.find(c => c.name === params.name)
      if (city) {
        emit('selectCity', city.id)
      }
    } else if (params.componentType === 'geo' && editStore.isAuthenticated) {
      // 编辑模式下点击地图空白处 - 添加城市
      emit('addCity', {
        longitude: params.value ? params.value[0] : null,
        latitude: params.value ? params.value[1] : null
      })
    }
  })

  // 窗口大小变化时重新调整
  window.addEventListener('resize', () => {
    chart.value?.resize()
  })
}

// 更新地图数据
const updateMap = () => {
  if (!chart.value) return

  // 设置已访问省份颜色
  const regions = placesStore.provinces.map(p => ({
    name: p.name,
    itemStyle: {
      areaColor: p.visited_at ? (themeStore.activeTheme?.primary_color || '#E8B4B8') : '#F0EDE5',
      borderColor: '#D0C8B8'
    }
  }))

  // 城市标记数据
  const cityData = placesStore.cities.map(c => ({
    name: c.name,
    value: [c.longitude, c.latitude],
    itemStyle: {
      color: themeStore.activeTheme?.accent_color || '#FF6B6B'
    }
  }))

  chart.value.setOption({
    geo: { regions },
    series: [{ data: cityData }]
  })
}

// 监听数据变化
watch(() => placesStore.cities, updateMap, { deep: true })
watch(() => placesStore.provinces, updateMap, { deep: true })
watch(() => themeStore.activeTheme, updateMap, { deep: true })

// 监听数据加载后更新
watch(() => placesStore.loading, (loading) => {
  if (!loading && placesStore.hasCities) {
    updateMap()
  }
})

// 聚焦到指定城市
const focusCity = (city) => {
  if (!chart.value || !city) return
  chart.value.setOption({
    geo: {
      center: [city.longitude, city.latitude],
      zoom: 3
    }
  })
}

defineExpose({ focusCity })
</script>

<style scoped>
.map-container {
  width: 100%;
  height: 100%;
}
</style>