<template>
  <div
    ref="appShellRef"
    class="app-shell"
    :class="{ 'immersive-space': isGlobeSpaceView, 'panels-collapsed': panelsCollapsed }"
    :style="appStyle"
    @scroll="handleWindowScroll"
  >
    <div class="ambient-layer">
      <div class="gradient-orb orb-1"></div>
      <div class="gradient-orb orb-2"></div>
      <div class="gradient-orb orb-3"></div>
      <div class="light-rays"></div>
      <div class="noise-overlay"></div>
    </div>

    <!-- 手机端底部导航 -->
    <nav v-if="isMobile" class="mobile-nav">
      <button class="nav-item" :class="{ active: mobileView === 'map' }" @click="mobileView = 'map'">
        <span class="nav-icon">🗺</span>
        <span class="nav-label">地图</span>
      </button>
      <button class="nav-item" :class="{ active: mobileView === 'list' }" @click="mobileView = 'list'">
        <span class="nav-icon">📋</span>
        <span class="nav-label">列表</span>
      </button>
      <button class="nav-item" :class="{ active: mobileView === 'detail' }" @click="mobileView = 'detail'">
        <span class="nav-icon">📄</span>
        <span class="nav-label">详情</span>
      </button>
      <button class="nav-item" :class="{ active: mobileView === 'stats' }" @click="mobileView = 'stats'">
        <span class="nav-icon">📊</span>
        <span class="nav-label">统计</span>
      </button>
    </nav>

    <header class="topbar panel panel-soft" :class="{ 'mobile-compact': isMobile, condensed: topbarCondensed }">
      <div class="brand-block">
        <span class="eyebrow">Journey Archive</span>
        <div class="brand-line">
          <h1>{{ currentViewName }}</h1>
          <span class="status-pill">{{ currentViewBadge }}</span>
        </div>
        <p>{{ currentViewDescription }}</p>
        <div class="breadcrumb-bar" v-if="visibleBreadcrumbTrail.length">
          <button
            v-for="crumb in visibleBreadcrumbTrail"
            :key="crumb.id"
            class="breadcrumb-chip"
            :class="{ active: crumb.active }"
            @click="handleBreadcrumbClick(crumb.id)"
          >
            {{ crumb.label }}
          </button>
        </div>
      </div>

      <div class="topbar-actions">
        <button v-if="currentCityArea" class="ghost-btn" @click="backToProvince">上一级城市</button>
        <button v-if="currentProvince" class="ghost-btn" @click="backToChina">世界视角</button>
        <button class="ghost-btn" @click="showThemePanel = true">切换风格</button>
        <button class="ghost-btn focus-toggle-btn" @click="panelsCollapsed = !panelsCollapsed">
          {{ panelsCollapsed ? '显示卡片' : '专注地图' }}
        </button>
        <button
          v-if="!editMode.isAuthenticated"
          class="ghost-btn"
          @click="openPasswordModal"
        >
          解锁编辑
        </button>
        <button
          v-if="editMode.isEditMode && editMode.isAuthenticated"
          class="ghost-btn active-badge"
          @click="editMode.logout()"
        >
          编辑模式
        </button>
        <button
          class="primary-btn"
          :disabled="!editMode.isAuthenticated"
          @click="openQuickAdd"
        >
          添加足迹
        </button>
      </div>
    </header>

    <transition name="notice-slide">
      <div v-if="systemNoticeMessage" class="system-notice panel panel-soft" :class="systemNoticeType">
        <span class="notice-dot"></span>
        <span class="notice-copy">{{ systemNoticeMessage }}</span>
        <button class="notice-close" type="button" @click="dismissSystemNotice">知道了</button>
      </div>
    </transition>

    <main
      class="workspace"
      :class="{
        'mobile-mode': isMobile,
        'empty-footprints': placesStore.cities.length === 0,
        'no-selection': !selectedFootprint && placesStore.cities.length > 0,
        'panels-collapsed': panelsCollapsed,
      }"
    >
      <!-- 空数据引导提示 -->
      <div v-if="showEmptyGuide" class="empty-state-overlay">
        <div class="empty-guide-card panel panel-soft animate-scale-in">
          <button class="guide-close" @click="dismissEmptyGuide" aria-label="关闭引导">×</button>
          <div class="guide-icon">🗺️</div>
          <h2>开始记录你们的足迹</h2>
          <p>点击地图上的省份，进入后解锁编辑模式，即可添加第一个旅行足迹。</p>
          <div class="guide-steps">
            <div class="guide-step">
              <span class="step-num">1</span>
              <span class="step-text">点击地图选择省份</span>
            </div>
            <div class="guide-step">
              <span class="step-num">2</span>
              <span class="step-text">点击"解锁编辑"输入密码</span>
            </div>
            <div class="guide-step">
              <span class="step-num">3</span>
              <span class="step-text">添加足迹、照片和故事</span>
            </div>
          </div>
          <button class="primary-btn" @click="openPasswordModal">开始记录</button>
        </div>
      </div>

      <aside class="sidebar panel panel-strong" :class="{ 'mobile-hidden': isMobile && mobileView !== 'list' && mobileView !== 'stats' }" v-if="placesStore.cities.length > 0">
        <section v-if="!isMobile || mobileView === 'stats'" class="narrative-card">
          <span class="eyebrow">Shared Miles</span>
          <h2>把一起走过的路，收进同一张地图</h2>
          <p>
            每一个省份、城市和区县，都不是冰冷的坐标。它们是某次出发、某顿晚餐、
            某张照片和某个忽然想起的傍晚。
          </p>
        </section>

        <section v-if="!isMobile || mobileView === 'stats'" class="stat-grid">
          <article class="stat-card">
            <span class="stat-label">正在翻看的记忆</span>
            <strong>{{ filteredCities.length }}</strong>
            <small>{{ currentCityArea ? '这一城里的细小停留' : currentProvince ? '这一省里的同行片段' : '收藏在地图里的全部片段' }}</small>
          </article>
          <article class="stat-card">
            <span class="stat-label">共同抵达</span>
            <strong>{{ visitedProvinces }}</strong>
            <small>从远方到日常都算数</small>
          </article>
          <article class="stat-card">
            <span class="stat-label">留下照片</span>
            <strong>{{ totalPhotos }}</strong>
            <small>替记忆保留光线</small>
          </article>
          <article class="stat-card accent-card">
            <span class="stat-label">现在看到</span>
            <strong>{{ currentViewBadge }}</strong>
            <small>{{ currentCityArea ? '城市里的某个角落' : currentProvince ? '一片省域里的城市' : '从整张中国地图开始' }}</small>
          </article>
        </section>

        <section v-if="!isMobile || mobileView === 'stats'" class="region-card">
          <div class="section-heading">
            <span class="eyebrow">Region Pulse</span>
            <h3>{{ regionStatsTitle }}</h3>
          </div>
          <div class="region-metrics">
            <div>
              <strong>{{ regionStats.records }}</strong>
              <span>足迹记录</span>
            </div>
            <div>
              <strong>{{ regionStats.photos }}</strong>
              <span>照片沉淀</span>
            </div>
            <div>
              <strong>{{ regionStats.tags }}</strong>
              <span>独立标签</span>
            </div>
          </div>
          <p>{{ regionStats.range }}</p>
        </section>

        <section v-if="!isMobile || mobileView === 'stats'" class="filter-card">
          <div class="section-heading">
            <span class="eyebrow">Smart Filter</span>
            <h3>按内容状态筛选</h3>
          </div>
          <div class="search-controls">
            <input
              v-model="searchQuery"
              class="search-input"
              type="search"
              placeholder="搜索城市、区县、标签或故事"
            />
            <select v-model="activeYear" class="year-select">
              <option value="all">全部年份</option>
              <option v-for="year in yearOptions" :key="year" :value="year">{{ year }}</option>
            </select>
          </div>
          <div class="ai-search-box">
            <input
              v-model="aiSearchQuery"
              class="search-input"
              type="search"
              placeholder="AI 搜索：比如下雨天、夜景、第一次旅行"
              @keyup.enter="runAiSearch"
            />
            <button class="ghost-btn ai-action-btn" :disabled="aiBusy.search" @click="runAiSearch">
              {{ aiBusy.search ? '查找中' : 'AI 搜索' }}
            </button>
          </div>
          <p v-if="aiSearchReason" class="ai-inline-note">{{ aiSearchReason }}</p>
          <button
            v-if="aiMatchedIds.length"
            class="ghost-btn full-width ai-clear-btn"
            type="button"
            @click="aiMatchedIds = []; aiSearchReason = ''; aiSearchQuery = ''"
          >
            清除 AI 搜索结果
          </button>
          <div class="chip-group">
            <button
              v-for="filter in filterOptions"
              :key="filter.id"
              class="chip"
              :class="{ active: activeFilter === filter.id }"
              @click="activeFilter = filter.id"
            >
              {{ filter.label }}
              <span>{{ filter.count }}</span>
            </button>
          </div>
        </section>

        <section v-if="isMobile && mobileView === 'list'" class="memory-list-card mobile-list-card">
          <div class="section-heading">
            <span class="eyebrow">Collection</span>
            <h3>{{ currentCityArea ? '当前城市的足迹' : currentProvince ? '本省足迹列表' : '全部足迹列表' }}</h3>
          </div>

          <div class="collection-tip">
            {{ collectionTip }}
          </div>

          <div v-if="filteredCities.length" class="memory-list">
            <button
              v-for="city in filteredCities"
              :key="city.id"
              class="memory-item"
              :class="{ active: selectedFootprint?.id === city.id }"
              @click="selectFootprint(city.id)"
            >
              <small>{{ detailLocationText(city) }} · {{ formatDate(city.visited_at) }}</small>
              <strong>{{ cityLabel(city) }}</strong>
              <p>{{ citySummary(city) }}</p>
            </button>
          </div>
          <div v-else class="empty-block">
            当前视图下还没有足迹。
          </div>
        </section>

        <section v-if="!isMobile || mobileView === 'list'" class="timeline-card">
          <div class="section-heading">
            <span class="eyebrow">Timeline</span>
            <h3>最近记录</h3>
          </div>

          <div v-if="timelineCities.length" class="timeline-list">
            <button
              v-for="city in timelineCities"
              :key="city.id"
              class="timeline-item"
              :class="{ active: selectedFootprint?.id === city.id }"
              @click="selectFootprint(city.id)"
            >
              <small>{{ formatDate(city.visited_at) }}</small>
              <strong>{{ cityLabel(city) }}</strong>
              <p>{{ city.province_name || '未归类省份' }} · {{ citySummary(city) }}</p>
            </button>
          </div>
          <div v-else class="empty-block">
            当前视图下还没有符合筛选条件的足迹。
          </div>
        </section>

        <!-- 旅程时间线 -->
        <section v-if="!isMobile || mobileView === 'list'" class="journey-timeline-card">
          <div class="section-heading">
            <span class="eyebrow">Journeys</span>
            <h3>旅途路线</h3>
          </div>

          <div class="journey-filter">
            <button
              v-for="type in journeyTypeOptions"
              :key="type.id"
              class="chip small-chip"
              :class="{ active: journeyFilter === type.id }"
              @click="journeyFilter = type.id"
            >
              {{ type.icon }} {{ type.label }}
            </button>
          </div>

          <div v-if="filteredJourneys.length" class="journey-list">
            <button
              v-for="journey in filteredJourneys"
              :key="journey.id"
              class="journey-item"
              :class="{ active: selectedJourney?.id === journey.id }"
              @click="selectJourneyOnMap(journey)"
            >
              <span class="journey-transport">{{ getJourneyIcon(journey.transport_type) }}</span>
              <div class="journey-info">
                <strong>{{ journey.from_city_name }} → {{ journey.to_city_name }}</strong>
                <small>{{ journey.transport_name || getJourneyTypeLabel(journey.transport_type) }}</small>
                <p v-if="journey.departure_time">{{ formatJourneyDate(journey.departure_time) }}</p>
              </div>
            </button>
          </div>
          <div v-else class="empty-block">
            还没有记录旅途路线。
          </div>

          <button
            v-if="editMode.isAuthenticated"
            class="primary-btn full-width"
            @click="openAddJourney"
          >
            添加旅程
          </button>
        </section>
      </aside>

      <section class="map-stage panel panel-strong" :class="{ 'mobile-hidden': isMobile && mobileView !== 'map' }">
        <div class="map-stage-header">
          <div>
            <span class="eyebrow">Atlas</span>
            <h2>{{ mapStageTitle }}</h2>
            <p class="stage-subcopy">{{ currentActionHint }}</p>
          </div>
          <div class="map-stage-actions">
            <div class="stage-mode-group" role="group" aria-label="地图视图切换">
              <button class="ghost-btn" :class="{ 'active-badge': viewMode === 'map' }" @click="viewMode = 'map'">地图</button>
              <button class="ghost-btn" :class="{ 'active-badge': viewMode === 'timeline' }" @click="viewMode = 'timeline'">时间轴</button>
            </div>
            <div class="map-zoom-cluster" role="group" aria-label="地图缩放控制">
              <button class="zoom-chip" type="button" @click="zoomOut">−</button>
              <button class="zoom-chip reset" type="button" @click="resetView">重置</button>
              <button class="zoom-chip" type="button" @click="zoomIn">+</button>
            </div>
          </div>
        </div>

        <div
          ref="mapStageBodyRef"
          class="map-stage-body"
          :class="[`skin-${activeMapSkin}`, { transitioning: mapTransitioning, 'timeline-mode': viewMode === 'timeline', 'space-view': isGlobeSpaceView }]"
          :style="mapStageStyle"
        >
          <!-- 地图选点提示（编辑模式下显示） -->
          <transition name="fade">
            <div v-if="isPickingLocation && editMode.isAuthenticated" class="location-picker-tip">
              <span>点击地图选择位置</span>
              <button class="cancel-btn" @click="cancelPickingLocation">取消</button>
            </div>
          </transition>

          <div v-if="viewMode === 'map'" class="map-overlay-card" :class="{ collapsed: mapOverlayCollapsed }">
            <button
              class="map-overlay-head"
              type="button"
              :aria-label="mapOverlayCollapsed ? '展开地图说明' : '收起地图说明'"
              @click="mapOverlayCollapsed = !mapOverlayCollapsed"
            >
              <span class="floating-badge">{{ currentCityArea ? '区县记忆' : currentProvince ? '城市章节' : '故事模式' }}</span>
              <span class="overlay-toggle">
                {{ mapOverlayCollapsed ? '展开' : '收起' }}
              </span>
            </button>
            <h3>{{ mapOverlayTitle }}</h3>
            <p v-if="!mapOverlayCollapsed">{{ mapOverlayDescription }}</p>
            <div v-if="!mapOverlayCollapsed" class="context-pills">
              <span class="context-pill">{{ currentLayerMetric }}</span>
              <span class="context-pill">{{ currentActionShort }}</span>
            </div>
          </div>

          <div ref="mapRef" class="maplibre-container" :class="{ muted: viewMode === 'timeline' }"></div>
          <transition name="map-wash">
            <div v-if="viewMode === 'map' && !isMapTextureReady" class="map-texture-loader">
              <span class="texture-orbit"></span>
              <strong>正在绘制地球纹理</strong>
              <small>边界、地名和足迹图层马上就绪</small>
            </div>
          </transition>
          <transition name="map-wash">
            <div v-if="mapTransitioning" class="map-transition-overlay">
              <span>{{ transitionText }}</span>
            </div>
          </transition>

          <transition name="tooltip-fade">
            <div v-if="viewMode === 'map' && hoverLabel && !selectedFootprint" class="map-tooltip panel panel-soft" :style="tooltipStyle">
              <span class="tooltip-title">{{ hoverLabel.title }}</span>
              <span class="tooltip-subtitle">{{ hoverLabel.subtitle }}</span>
            </div>
          </transition>

          <div v-if="viewMode === 'map'" class="legend-card panel panel-soft" :class="{ collapsed: legendCollapsed }">
            <button class="legend-toggle" type="button" @click="legendCollapsed = !legendCollapsed">
              <span class="legend-title-clean">图层</span>
              <span>{{ legendCollapsed ? '展开' : '收起' }}</span>
            </button>
            <span class="legend-title">图层说明</span>
            <div class="legend-row">
              <i class="legend-dot"></i>
              <span>已记录足迹</span>
            </div>
            <div class="legend-row">
              <i class="legend-dot strong"></i>
              <span>当前查看项目</span>
            </div>
            <div class="legend-row">
              <i class="legend-line"></i>
              <span>旅途路线</span>
            </div>
          </div>

          <div v-if="viewMode === 'timeline'" class="timeline-board">
            <div class="timeline-board-header">
              <span class="eyebrow">Chronicle View</span>
              <h3>按时间重看这片区域</h3>
              <p>时间轴会跟随当前地图层级、关键词和年份筛选变化，适合把故事脉络落到地图点位。</p>
            </div>
            <div v-if="timelineGroups.length" class="timeline-board-list">
              <section v-for="group in timelineGroups" :key="group.year" class="timeline-year-group">
                <div class="timeline-year">{{ group.year }}</div>
                <button
                  v-for="city in group.items"
                  :key="city.id"
                  class="timeline-board-item"
                  :class="{ active: selectedFootprint?.id === city.id }"
                  @click="selectFootprint(city.id)"
                >
                  <span>{{ formatDate(city.visited_at) }}</span>
                  <strong>{{ cityLabel(city) }}</strong>
                  <small>{{ detailLocationText(city) }}</small>
                  <p>{{ citySummary(city) }}</p>
                </button>
              </section>
            </div>
            <div v-else class="empty-block timeline-empty">
              当前条件下没有可展示的时间轴记录。
            </div>
          </div>
        </div>
      </section>

      <aside class="detail-panel panel panel-strong" :class="{ 'mobile-hidden': isMobile && mobileView !== 'detail', 'idle-detail-panel': !selectedFootprint && !selectedCluster }">
        <template v-if="selectedFootprint">
          <div class="detail-header">
            <span class="eyebrow">Memory Detail</span>
            <h2>{{ cityLabel(selectedFootprint) }}</h2>
            <p>{{ detailLocationText(selectedFootprint) }}</p>
          </div>

          <div class="hero-photo" :style="detailHeroStyle">
            <div class="hero-badges">
              <span>{{ formatDate(selectedFootprint.visited_at) }}</span>
              <span>{{ footprintPhotos.length }} 张照片</span>
            </div>
          </div>

          <div class="detail-copy">
            <p v-if="selectedFootprint.description">{{ selectedFootprint.description }}</p>
            <p v-else class="muted-copy">这段旅程还没有写下故事，可以在编辑模式中补充描述和照片。</p>
          </div>

          <div v-if="parseTags(selectedFootprint.tags).length" class="tag-group">
            <span v-for="tag in parseTags(selectedFootprint.tags)" :key="tag" class="tag">{{ tag }}</span>
          </div>

          <div class="photo-strip" v-if="footprintPhotos.length">
            <button
              v-for="(photo, index) in footprintPhotos"
              :key="photo.id"
              class="photo-thumb"
              :class="{ active: currentPhotoIndex === index }"
              @click="currentPhotoIndex = index"
            >
              <img :src="photo.file_path" :alt="photo.original_name || cityLabel(selectedFootprint)" />
              <span v-if="photo.is_cover" class="cover-badge">封面</span>
            </button>
          </div>

          <div v-if="editMode.isAuthenticated && footprintPhotos.length" class="photo-tools">
            <button
              class="ghost-btn"
              :disabled="activePhoto?.is_cover"
              @click="markActivePhotoAsCover"
            >
              设为封面
            </button>
            <button class="ghost-btn" :disabled="currentPhotoIndex === 0" @click="moveActivePhoto(-1)">
              前移
            </button>
            <button
              class="ghost-btn"
              :disabled="currentPhotoIndex === footprintPhotos.length - 1"
              @click="moveActivePhoto(1)"
            >
              后移
            </button>
            <button class="danger-btn compact-danger" @click="removeActivePhoto">删除照片</button>
          </div>

          <div class="detail-actions">
            <button class="ghost-btn full-width" @click="closeFootprintPanel">收起详情</button>
            <button
              v-if="editMode.isAuthenticated"
              class="primary-btn full-width"
              @click="editFootprint(selectedFootprint)"
            >
              编辑这段记忆
            </button>
          </div>

          <button
            v-if="editMode.isAuthenticated"
            class="danger-btn"
            @click="confirmDelete(selectedFootprint.id)"
          >
            删除这条足迹
          </button>
        </template>

        <template v-else-if="selectedCluster">
          <div class="detail-header">
            <span class="eyebrow">Grouped Memories</span>
            <h2>{{ selectedCluster.label }}</h2>
            <p>{{ selectedCluster.records.length }} 条足迹 · {{ clusterPhotoCount(selectedCluster.records) }} 张照片</p>
          </div>

          <div class="cluster-summary">
            <strong>{{ clusterDateRange(selectedCluster.records) }}</strong>
            <p>同一个城市或区县下有多条记录时，会先聚合成一个入口，方便你按时间逐条打开。</p>
          </div>

          <div class="cluster-list">
            <button
              v-for="record in selectedCluster.records"
              :key="record.id"
              class="cluster-item"
              @click="selectFootprint(record.id)"
            >
              <small>{{ formatDate(record.visited_at) }}</small>
              <strong>{{ cityLabel(record) }}</strong>
              <p>{{ citySummary(record) }}</p>
            </button>
          </div>

          <div class="detail-actions">
            <button class="ghost-btn full-width" @click="selectedCluster = null">收起聚合</button>
          </div>
        </template>

        <template v-else>
          <div class="detail-empty">
            <span class="eyebrow">Memory Detail</span>
            <h2>{{ emptyDetailTitle }}</h2>
            <p>{{ emptyDetailDescription }}</p>
            <div class="detail-empty-actions">
              <button v-if="!editMode.isAuthenticated" class="primary-btn" type="button" @click="openPasswordModal">解锁后添加</button>
              <button class="ghost-btn" type="button" @click="resetView">世界视角</button>
              <button class="ghost-btn" type="button" @click="showThemePanel = true">切换主题</button>
              <button class="primary-btn" type="button" :disabled="!editMode.isAuthenticated" @click="openQuickAdd">添加足迹</button>
            </div>
            <small v-if="!editMode.isAuthenticated" class="detail-empty-note">解锁编辑后，就可以从地图选点补充新的旅行记忆。</small>
          </div>
        </template>

        <section v-if="!isMobile" class="memory-list-card">
          <div class="ai-memory-card">
            <div>
              <span class="eyebrow">AI Story Mode</span>
              <h3>{{ aiMapSummary?.headline || '让 AI 读懂当前地图' }}</h3>
              <p>{{ aiMapSummary?.summary || '根据当前省份、城市、筛选结果和足迹内容，生成一张旅行记忆总结卡。' }}</p>
            </div>
            <ul v-if="aiMapSummary?.highlights?.length" class="ai-highlight-list">
              <li v-for="item in aiMapSummary.highlights" :key="item">{{ item }}</li>
            </ul>
            <button class="ghost-btn full-width" :disabled="!editMode.isAuthenticated || aiBusy.summary" @click="runAiMapSummary">
              {{ aiBusy.summary ? '生成中' : 'AI 总结当前视角' }}
            </button>
          </div>

          <div class="section-heading">
            <span class="eyebrow">Collection</span>
            <h3>{{ currentCityArea ? '当前城市的足迹' : currentProvince ? '本省足迹列表' : '全部足迹列表' }}</h3>
          </div>

          <div class="collection-tip">
            {{ collectionTip }}
          </div>

          <div v-if="filteredCities.length" class="memory-list">
            <button
              v-for="city in filteredCities"
              :key="city.id"
              class="memory-item"
              :class="{ active: selectedFootprint?.id === city.id }"
              @click="selectFootprint(city.id)"
            >
              <small>{{ detailLocationText(city) }} · {{ formatDate(city.visited_at) }}</small>
              <strong>{{ cityLabel(city) }}</strong>
              <p>{{ citySummary(city) }}</p>
            </button>
          </div>
          <div v-else class="empty-block">
            当前视图下还没有足迹。
          </div>
        </section>
      </aside>
    </main>

    <transition name="overlay-fade">
      <div v-if="showAddPanel" class="overlay-shell" @click.self="closeAddPanel">
        <div class="modal-card panel panel-strong animate-scale-in">
          <div class="modal-header">
            <span class="eyebrow">Create Memory</span>
            <h3>添加足迹</h3>
            <p>{{ formHeaderText }}</p>
          </div>

          <div class="form-intro-grid">
            <div class="helper-card helper-card-accent">
              <strong>记录建议</strong>
              <p>如果已经下钻到区县，建议每个区县单独记一条，这样地图会更真实。</p>
            </div>
            <div class="helper-card">
              <strong>定位状态</strong>
              <p>{{ addLocationSummary }}</p>
              <button
                v-if="formData.latitude && formData.longitude"
                class="mini-btn"
                @click="formData.latitude = null; formData.longitude = null"
              >
                清除坐标
              </button>
            </div>
          </div>

          <div class="form-grid">
            <label class="field-block full-span">
              <span>坐标位置</span>
              <div class="coord-picker">
                <span v-if="formData.latitude && formData.longitude">
                  {{ formData.latitude.toFixed(4) }}, {{ formData.longitude.toFixed(4) }}
                </span>
                <span v-else class="coord-placeholder">未设置坐标</span>
                <button class="pick-btn" @click="showAddPanel = false; startPickingLocation()">
                  {{ formData.latitude ? '重新选点' : '地图选点' }}
                </button>
              </div>
            </label>

            <label class="field-block">
              <span>城市 / 地点</span>
              <input
                v-model="formData.city_name"
                class="field-control"
                list="city-options"
                placeholder="输入地点，或选择城市"
              />
              <datalist id="city-options">
                <option v-for="city in availableCities" :key="city.value" :value="city.value">{{ city.label }}</option>
              </datalist>
            </label>

            <label v-if="currentCityArea" class="field-block">
              <span>区县</span>
              <input
                v-model="formData.district_name"
                class="field-control"
                list="district-options"
                placeholder="输入区县、街区或地点"
              />
              <datalist id="district-options">
                <option v-for="district in availableDistricts" :key="district.value" :value="district.value">{{ district.label }}</option>
              </datalist>
            </label>

            <label class="field-block">
              <span>访问日期</span>
              <input v-model="formData.visited_at" class="field-control" type="date" />
            </label>

            <label class="field-block full-span">
              <span class="field-title-row">
                记忆描述
                <button class="mini-btn" type="button" :disabled="aiBusy.draft || !editMode.isAuthenticated" @click="runAiFootprintDraft">
                  {{ aiBusy.draft ? '生成中' : 'AI 润色' }}
                </button>
              </span>
              <textarea
                v-model="formData.description"
                class="field-control textarea"
                rows="4"
                placeholder="写下这趟旅程最值得记住的画面"
              ></textarea>
            </label>

            <label class="field-block full-span">
              <span class="field-title-row">
                标签
                <button class="mini-btn" type="button" :disabled="aiBusy.draft || !editMode.isAuthenticated" @click="runAiFootprintDraft">
                  AI 标签
                </button>
              </span>
              <input
                v-model="formData.tags"
                class="field-control"
                placeholder="第一次旅行, 夜景, 美食"
              />
            </label>

            <div class="field-block full-span">
              <span>快捷标签</span>
              <div class="quick-tags">
                <button
                  v-for="tag in quickTagOptions"
                  :key="`add-${tag}`"
                  class="quick-tag"
                  type="button"
                  @click="appendTag('add', tag)"
                >
                  {{ tag }}
                </button>
              </div>
            </div>

            <label class="field-block full-span">
              <span>上传照片</span>
              <div
                class="upload-box"
                :class="{ dragover: isDragover }"
                @dragover.prevent="isDragover = true"
                @dragleave="isDragover = false"
                @drop.prevent="onDrop"
              >
                <input
                  ref="addUploadInput"
                  type="file"
                  multiple
                  accept="image/*"
                  capture="environment"
                  style="position: absolute; opacity: 0; width: 100%; height: 100%; top: 0; left: 0; cursor: pointer; z-index: 1;"
                  @change="handleUpload"
                />
                <strong style="position: relative; z-index: 2; pointer-events: none;">点击或拖拽照片到这里</strong>
                <p style="position: relative; z-index: 2; pointer-events: none;">支持一次补充多张旅行照片</p>
              </div>
            </label>
          </div>

          <div v-if="pendingPhotos.length" class="preview-grid">
            <div v-for="(photo, index) in pendingPhotos" :key="photo.preview" class="preview-card">
              <img :src="photo.preview" alt="preview" />
              <button class="preview-remove" @click="removePending(index)">×</button>
            </div>
          </div>

          <div class="modal-actions">
            <button class="ghost-btn" @click="closeAddPanel">取消</button>
            <button class="primary-btn" :disabled="!canSubmitFootprint" @click="submitFootprint">
              保存足迹
            </button>
          </div>
        </div>
      </div>
    </transition>

    <transition name="overlay-fade">
      <div v-if="showEditPanel" class="overlay-shell" @click.self="closeEditPanel">
        <div class="modal-card panel panel-strong animate-scale-in">
          <div class="modal-header">
            <span class="eyebrow">Refine Memory</span>
            <h3>编辑足迹</h3>
            <p>{{ editingFootprint ? cityLabel(editingFootprint) : '' }}</p>
          </div>

          <div class="form-intro-grid">
            <div class="helper-card helper-card-accent">
              <strong>当前范围</strong>
              <p>{{ editingFootprint ? detailLocationText(editingFootprint) : '选择足迹后开始编辑' }}</p>
            </div>
            <div class="helper-card">
              <strong>当前状态</strong>
              <p>{{ editLocationSummary }}</p>
            </div>
          </div>

          <div class="form-grid">
            <label class="field-block">
              <span>城市</span>
              <input :value="editingFootprint?.name || ''" class="field-control" readonly />
            </label>

            <label class="field-block">
              <span>区县</span>
              <input :value="editingFootprint?.district_name || '未细分区县'" class="field-control" readonly />
            </label>

            <label class="field-block">
              <span>访问日期</span>
              <input v-model="editData.visited_at" class="field-control" type="date" />
            </label>

            <label class="field-block full-span">
              <span>记忆描述</span>
              <textarea
                v-model="editData.description"
                class="field-control textarea"
                rows="4"
                placeholder="更新这段旅程的故事"
              ></textarea>
            </label>

            <label class="field-block full-span">
              <span>标签</span>
              <input
                v-model="editData.tags"
                class="field-control"
                placeholder="第一次旅行, 夜景, 美食"
              />
            </label>

            <div class="field-block full-span">
              <span>快捷标签</span>
              <div class="quick-tags">
                <button
                  v-for="tag in quickTagOptions"
                  :key="`edit-${tag}`"
                  class="quick-tag"
                  type="button"
                  @click="appendTag('edit', tag)"
                >
                  {{ tag }}
                </button>
              </div>
            </div>

            <label class="field-block full-span">
              <span>补充照片</span>
              <div
                class="upload-box"
                :class="{ dragover: isDragover }"
                @dragover.prevent="isDragover = true"
                @dragleave="isDragover = false"
                @drop.prevent="onDrop"
              >
                <input
                  ref="editUploadInput"
                  type="file"
                  multiple
                  accept="image/*"
                  capture="environment"
                  style="position: absolute; opacity: 0; width: 100%; height: 100%; top: 0; left: 0; cursor: pointer; z-index: 1;"
                  @change="handleUpload"
                />
                <strong style="position: relative; z-index: 2; pointer-events: none;">点击或拖拽照片到这里</strong>
                <p style="position: relative; z-index: 2; pointer-events: none;">新增照片会自动追加到这条足迹</p>
              </div>
            </label>
          </div>

          <div v-if="pendingPhotos.length" class="preview-grid">
            <div v-for="(photo, index) in pendingPhotos" :key="photo.preview" class="preview-card">
              <img :src="photo.preview" alt="preview" />
              <button class="preview-remove" @click="removePending(index)">×</button>
            </div>
          </div>

          <div class="modal-actions">
            <button class="ghost-btn" @click="closeEditPanel">取消</button>
            <button class="primary-btn" :disabled="!editData.visited_at" @click="updateFootprint">
              保存修改
            </button>
          </div>
        </div>
      </div>
    </transition>

    <transition name="overlay-fade">
      <div v-if="showThemePanel" class="overlay-shell" @click.self="showThemePanel = false">
        <div class="theme-panel panel panel-strong animate-scale-in">
          <div class="modal-header">
            <span class="eyebrow">Visual Tone</span>
            <h3>选择整站风格</h3>
            <p>风格会同时改变页面、地图、卡片和路线色彩，让每次翻看都有不同的情绪。</p>
          </div>

          <div class="theme-grid">
            <button
              v-for="skin in mapSkinOptions"
              :key="skin.id"
              class="theme-card"
              :class="{ active: skin.id === activeMapSkin }"
              @click="setMapSkin(skin.id)"
            >
              <div class="theme-preview" :style="getThemePreviewStyle(skin)">
                <div class="theme-preview-dot"></div>
              </div>
              <strong>{{ skin.name }}</strong>
              <small>{{ skin.mood }}</small>
            </button>
          </div>
        </div>
      </div>
    </transition>

    <transition name="overlay-fade">
      <div v-if="showPasswordModal" class="overlay-shell" @click.self="showPasswordModal = false">
        <div class="auth-panel panel panel-strong animate-scale-in">
          <div class="modal-header">
            <span class="eyebrow">Secure Edit</span>
            <h3>解锁编辑</h3>
            <p>输入密码后即可新增、编辑和删除区县级足迹。</p>
          </div>

          <div class="form-grid">
            <label class="field-block full-span">
              <span>编辑密码</span>
              <input
                v-model="passwordInput"
                class="field-control"
                type="password"
                placeholder="输入密码"
                @keyup.enter="submitPassword"
              />
            </label>
          </div>

          <p v-if="authError" class="auth-error">{{ authError }}</p>

          <div class="modal-actions">
            <button class="ghost-btn" @click="showPasswordModal = false">取消</button>
            <button class="primary-btn" @click="submitPassword">确认</button>
          </div>
        </div>
      </div>
    </transition>

    <transition name="overlay-fade">
      <div v-if="fullscreenPhoto" class="fullscreen-viewer" @click="fullscreenPhoto = null">
        <img :src="fullscreenPhoto.file_path" class="fullscreen-image" :alt="fullscreenPhoto.original_name || 'photo'" />
      </div>
    </transition>

    <!-- 添加旅程弹窗 -->
    <transition name="overlay-fade">
      <div v-if="showAddJourneyPanel" class="overlay-shell" @click.self="closeAddJourneyPanel">
        <div class="modal-card panel panel-strong animate-scale-in">
          <div class="modal-header">
            <span class="eyebrow">Add Journey</span>
            <h3>{{ editingJourney ? '编辑旅途路线' : '添加旅途路线' }}</h3>
            <p>{{ editingJourney ? '调整这段旅程的交通与时间信息' : '记录从一个地点到另一个地点的旅程' }}</p>
          </div>

          <div class="journey-route-display">
            <div class="route-point">
              <span class="point-label">起点</span>
              <strong>{{ journeyFormData.from_city_id ? getCityNameById(journeyFormData.from_city_id) : '选择起点' }}</strong>
            </div>
            <div class="route-arrow">{{ getJourneyIcon(journeyFormData.transport_type) }}</div>
            <div class="route-point">
              <span class="point-label">终点</span>
              <strong>{{ journeyFormData.to_city_id ? getCityNameById(journeyFormData.to_city_id) : '选择终点' }}</strong>
            </div>
          </div>

          <div class="form-grid">
            <div class="field-block full-span">
              <span>选择起点城市</span>
              <select v-model="journeyFormData.from_city_id" class="field-control">
                <option value="">请选择</option>
                <option v-for="city in placesStore.cities" :key="city.id" :value="city.id" :disabled="city.id === journeyFormData.to_city_id">
                  {{ city.province_name }} · {{ city.name }}{{ city.district_name ? ' · ' + city.district_name : '' }}
                </option>
              </select>
            </div>

            <div class="field-block full-span">
              <span>选择终点城市</span>
              <select v-model="journeyFormData.to_city_id" class="field-control">
                <option value="">请选择</option>
                <option v-for="city in placesStore.cities" :key="city.id" :value="city.id" :disabled="city.id === journeyFormData.from_city_id">
                  {{ city.province_name }} · {{ city.name }}{{ city.district_name ? ' · ' + city.district_name : '' }}
                </option>
              </select>
            </div>

            <div class="field-block full-span">
              <span>交通类型</span>
              <div class="transport-selector">
                <button
                  v-for="type in journeyTypeOptions"
                  :key="type.id"
                  class="transport-btn"
                  :class="{ active: journeyFormData.transport_type === type.id }"
                  @click="journeyFormData.transport_type = type.id"
                >
                  {{ type.icon }}
                  <small>{{ type.label }}</small>
                </button>
              </div>
            </div>

            <label class="field-block">
              <span>班次信息</span>
              <input v-model="journeyFormData.transport_name" class="field-control" placeholder="航班号、车次等" />
            </label>

            <label class="field-block">
              <span>出发时间</span>
              <input v-model="journeyFormData.departure_time" class="field-control" type="datetime-local" />
            </label>

            <label class="field-block">
              <span>到达时间</span>
              <input v-model="journeyFormData.arrival_time" class="field-control" type="datetime-local" />
            </label>

            <label class="field-block full-span">
              <span class="field-title-row">
                旅途备注
                <button class="mini-btn" type="button" :disabled="aiBusy.journey || !editMode.isAuthenticated || !canSubmitJourney" @click="runAiJourneyTitle">
                  {{ aiBusy.journey ? '生成中' : 'AI 命名路线' }}
                </button>
              </span>
              <textarea v-model="journeyFormData.notes" class="field-control textarea" rows="3" placeholder="旅途中的见闻感受"></textarea>
            </label>
          </div>

          <div class="modal-actions">
            <button class="ghost-btn" @click="closeAddJourneyPanel">取消</button>
            <button class="primary-btn" :disabled="!canSubmitJourney" @click="submitJourney">
              {{ editingJourney ? '更新旅程' : '保存旅程' }}
            </button>
          </div>
        </div>
      </div>
    </transition>

    <!-- 旅程详情卡片 -->
    <transition name="overlay-fade">
      <div v-if="showJourneyDetail && selectedJourney" class="overlay-shell" @click.self="closeJourneyDetail">
        <div class="journey-detail-card panel panel-strong animate-scale-in">
          <div class="journey-detail-header">
            <span class="journey-icon-large">{{ getJourneyIcon(selectedJourney.transport_type) }}</span>
            <h3>{{ selectedJourney.from_city_name }} → {{ selectedJourney.to_city_name }}</h3>
            <p>{{ getJourneyTypeLabel(selectedJourney.transport_type) }}</p>
          </div>

          <div class="journey-detail-body">
            <div class="journey-meta">
              <div class="meta-item">
                <span class="meta-label">📅 日期</span>
                <strong>{{ formatJourneyDate(selectedJourney.departure_time) || '未记录' }}</strong>
              </div>
              <div class="meta-item">
                <span class="meta-label">🛫 出发</span>
                <strong>{{ formatJourneyTime(selectedJourney.departure_time) || '未记录' }}</strong>
              </div>
              <div class="meta-item">
                <span class="meta-label">🛬 到达</span>
                <strong>{{ formatJourneyTime(selectedJourney.arrival_time) || '未记录' }}</strong>
              </div>
              <div class="meta-item" v-if="selectedJourney.duration_minutes">
                <span class="meta-label">⏱️ 行程</span>
                <strong>{{ formatDuration(selectedJourney.duration_minutes) }}</strong>
              </div>
            </div>

            <div class="journey-flight-info" v-if="selectedJourney.transport_name">
              <span class="meta-label">📋 班次</span>
              <strong>{{ selectedJourney.transport_name }}</strong>
            </div>

            <div class="journey-notes" v-if="selectedJourney.notes">
              <span class="meta-label">💭 旅途故事</span>
              <p>{{ selectedJourney.notes }}</p>
            </div>
          </div>

          <div class="journey-detail-actions">
            <button class="ghost-btn" @click="closeJourneyDetail">关闭</button>
            <button v-if="editMode.isAuthenticated" class="ghost-btn" @click="editJourney(selectedJourney)">编辑</button>
            <button v-if="editMode.isAuthenticated" class="danger-btn" @click="confirmDeleteJourney(selectedJourney.id)">删除</button>
          </div>
        </div>
      </div>
    </transition>

    <!-- 非遮挡式加载状态条 -->
    <transition name="status-slide">
      <div v-if="isLoading" class="status-bar">
        <div class="status-spinner"></div>
        <span>{{ loadingText }}</span>
      </div>
    </transition>

    <!-- Toast 提示（只用于成功反馈） -->
    <transition name="toast-slide">
      <div v-if="toastMessage && toastType === 'success'" class="toast-container success">
        <span class="toast-icon">{{ toastType === 'success' ? '✓' : toastType === 'error' ? '✗' : 'ℹ' }}</span>
        <span class="toast-message">{{ toastMessage }}</span>
      </div>
    </transition>
  </div>
</template>

<script setup>
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import 'maplibre-gl/dist/maplibre-gl.css'
import {
  deletePhoto,
  generateFootprintDraft,
  generateJourneyTitle,
  generateMapSummary,
  reverseGeocode,
  searchFootprintsWithAi,
  setCoverPhoto,
  updatePhotoOrder,
  uploadPhotos,
} from './api'
import { useEditStore } from './stores/edit'
import { usePlacesStore } from './stores/places'

const placesStore = usePlacesStore()
const editMode = useEditStore()

const appShellRef = ref(null)
const mapRef = ref(null)
const mapStageBodyRef = ref(null)
const addUploadInput = ref(null)
const editUploadInput = ref(null)
const isPickingLocation = ref(false) // 是否正在选点模式
const pickMarker = ref(null) // 选点标记
const isResolvingPickedLocation = ref(false)
const DEFAULT_GLOBE_CENTER = [104, 24]
const DEFAULT_GLOBE_ZOOM = 1.2
const MOBILE_GLOBE_ZOOM = 1.12
const SPACE_VIEW_MAX_ZOOM = 2.6
let mapInstance = null
let maplibreGlModule = null
let provinceLabelMarkers = []
let journeyVehicleMarkers = new Map()
let suppressLocationSync = false

const showThemePanel = ref(false)
const showPasswordModal = ref(false)
const showAddPanel = ref(false)
const showEditPanel = ref(false)
const selectedFootprint = ref(null)
const footprintPhotos = ref([])
const currentPhotoIndex = ref(0)
const fullscreenPhoto = ref(null)
const passwordInput = ref('')
const authError = ref('')
const isDragover = ref(false)
const pendingPhotos = ref([])
const isLoading = ref(false)
const loadingText = ref('加载中...')

// Toast 提示系统
const toastMessage = ref('')
const toastType = ref('info')
const systemNoticeMessage = ref('')
const systemNoticeType = ref('info')
const topbarCondensed = ref(false)
let toastTimer = null

function showToast(message, type = 'success', duration = 3000) {
  // Toast只用于成功反馈，错误使用系统通知
  if (type === 'error') {
    showSystemNotice(message, 'error')
    return
  }
  toastMessage.value = message
  toastType.value = type
  if (toastTimer) clearTimeout(toastTimer)
  toastTimer = setTimeout(() => {
    toastMessage.value = ''
  }, duration)
}

function showSystemNotice(message, type = 'info') {
  systemNoticeMessage.value = message
  systemNoticeType.value = type
}

function dismissSystemNotice() {
  systemNoticeMessage.value = ''
}

function clearMapTextureTimers() {
  if (mapTextureReadyTimer) {
    window.clearTimeout(mapTextureReadyTimer)
    mapTextureReadyTimer = null
  }
  if (mapTextureFallbackTimer) {
    window.clearTimeout(mapTextureFallbackTimer)
    mapTextureFallbackTimer = null
  }
}

function markMapTextureLoading() {
  clearMapTextureTimers()
  isMapTextureReady.value = false
  // 地图样式事件偶尔会在快速钻取时丢失，这个兜底避免加载遮罩卡死。
  mapTextureFallbackTimer = window.setTimeout(() => {
    isMapTextureReady.value = true
    mapTextureFallbackTimer = null
  }, 1400)
}

function markMapTextureReady(delay = 260) {
  if (mapTextureReadyTimer) window.clearTimeout(mapTextureReadyTimer)
  mapTextureReadyTimer = window.setTimeout(() => {
    isMapTextureReady.value = true
    clearMapTextureTimers()
  }, delay)
}

function updateTopbarCondensed() {
  const scrollTop = Math.max(window.scrollY || 0, appShellRef.value?.scrollTop || 0)
  topbarCondensed.value = scrollTop > (isMobile.value ? 70 : 120)
}

function handleWindowScroll() {
  updateTopbarCondensed()
}
const editingFootprint = ref(null)
const activeFilter = ref('all')
const activeYear = ref('all')
const searchQuery = ref('')
const aiSearchQuery = ref('')
const aiSearchReason = ref('')
const aiMatchedIds = ref([])
const aiMapSummary = ref(null)
const aiBusy = ref({
  draft: false,
  summary: false,
  search: false,
  journey: false,
})
const selectedCluster = ref(null)
const mapTransitioning = ref(false)
const transitionText = ref('正在切换地图层级...')
const viewMode = ref('map')
const activeMapSkin = ref(localStorage.getItem('mapSkin') || 'warm')
const emptyGuideDismissed = ref(localStorage.getItem('emptyGuideDismissed') !== '0')
const mapOverlayCollapsed = ref(true)
const legendCollapsed = ref(true)
const isMapTextureReady = ref(false)
const mapZoomLevel = ref(DEFAULT_GLOBE_ZOOM)
const panelsCollapsed = ref(false)

// 手机端适配
const MOBILE_BREAKPOINT = 768
const isMobile = ref(window.innerWidth < MOBILE_BREAKPOINT)
const mobileView = ref('map')
const checkMobile = () => {
  isMobile.value = window.innerWidth < MOBILE_BREAKPOINT
}
const mobileResizeHandler = () => {
  checkMobile()
  updateTopbarCondensed()
  requestMapResize()
}

const currentProvince = ref(null)
const currentCityArea = ref(null)
const provinceGeoCache = ref({})
const districtGeoCache = ref({})
const chinaGeoCache = ref(null)
const chinaBoundaryLoaded = ref(false) // 标记完整边界是否已加载
const hoverLabel = ref(null)
const tooltipPosition = ref({ x: 0, y: 0 })
let mapResizeObserver = null
let mapResizeTimer = null
let mapTextureReadyTimer = null
let mapTextureFallbackTimer = null
let journeyAnimationTimer = null
let journeyAnimationFrame = 0

let globeAutoRotate = true
let globeRotateTimer = null

const formData = ref(createEmptyForm())
const editData = ref({
  visited_at: '',
  description: '',
  tags: '',
})

// 旅程相关状态
const showAddJourneyPanel = ref(false)
const showJourneyDetail = ref(false)
const selectedJourney = ref(null)
const journeyFormData = ref({
  from_city_id: null,
  to_city_id: null,
  transport_type: 'flight',
  transport_name: '',
  departure_time: '',
  arrival_time: '',
  notes: '',
})
const editingJourney = ref(null)
const journeyFilter = ref('all') // all/flight/train/car/ship

const quickTagOptions = [
  '第一次',
  '夜景',
  '海边',
  '美食',
  '散步',
  '日落',
  '节日',
  '雨天',
]

const mapSkinOptions = [
  {
    id: 'warm',
    name: '暖砂',
    mood: '像傍晚翻开的旅行相册',
    preview: 'linear-gradient(135deg, #f5dcc0, #b85c38)',
    primary: '#8d5637',
    accent: '#c94f35',
    dark: '#2f2116',
    light: '#fff3df',
    pageBackground:
      'radial-gradient(circle at 10% 0%, rgba(255, 244, 226, 0.95), transparent 34%), radial-gradient(circle at 92% 12%, rgba(201, 114, 70, 0.18), transparent 28%), linear-gradient(135deg, #fff8ec 0%, #f0ddc3 48%, #dfc09e 100%)',
    text: '#2f2116',
    muted: 'rgba(47, 33, 22, 0.68)',
    panelSoft: 'rgba(255, 252, 247, 0.78)',
    panelStrong: 'rgba(255, 248, 236, 0.9)',
    panelBorder: 'rgba(139, 89, 54, 0.14)',
    accentSoft: 'rgba(201, 79, 53, 0.12)',
    buttonBg: 'rgba(255, 255, 255, 0.74)',
    buttonText: '#2f2116',
    orbOne: 'radial-gradient(circle, rgba(255, 107, 77, 0.2), transparent 70%)',
    orbTwo: 'radial-gradient(circle, rgba(212, 165, 116, 0.26), transparent 70%)',
    orbThree: 'radial-gradient(circle, rgba(232, 180, 145, 0.25), transparent 70%)',
    stageBackground:
      'radial-gradient(circle at 72% 18%, rgba(221, 151, 92, 0.26), transparent 28%), linear-gradient(145deg, #fff3df 0%, #ead3b4 48%, #c99b6c 100%)',
    sea: 'rgba(255, 250, 240, 0.72)',
    land: '#e7c39d',
    landAlt: '#f3d9ba',
    border: '#b88356',
    borderStrong: '#8d5637',
    glow: 'rgba(184, 92, 56, 0.28)',
    point: '#c94f35',
    pointHalo: 'rgba(201, 79, 53, 0.38)',
    label: '#6f4229',
    line: '#b85c38',
    routes: { flight: '#4f8cc9', train: '#6f8f55', car: '#d58945', ship: '#3f8d7b' },
    panel: 'rgba(255, 248, 236, 0.82)',
  },
  {
    id: 'night',
    name: '星图',
    mood: '适合深夜重看远方',
    preview: 'linear-gradient(135deg, #111827, #d9a441)',
    primary: '#e0ad58',
    accent: '#ffbf5f',
    dark: '#080d16',
    light: '#162033',
    pageBackground:
      'radial-gradient(circle at 12% 8%, rgba(224, 173, 88, 0.18), transparent 30%), radial-gradient(circle at 90% 20%, rgba(78, 143, 216, 0.14), transparent 32%), linear-gradient(135deg, #070b12 0%, #111827 45%, #221a13 100%)',
    text: '#fff0d2',
    muted: 'rgba(255, 239, 210, 0.66)',
    panelSoft: 'rgba(13, 19, 31, 0.76)',
    panelStrong: 'rgba(12, 18, 30, 0.88)',
    panelBorder: 'rgba(226, 184, 106, 0.18)',
    accentSoft: 'rgba(226, 184, 106, 0.16)',
    buttonBg: 'rgba(255, 236, 196, 0.1)',
    buttonText: '#ffe6b8',
    orbOne: 'radial-gradient(circle, rgba(224, 173, 88, 0.2), transparent 70%)',
    orbTwo: 'radial-gradient(circle, rgba(74, 144, 217, 0.18), transparent 70%)',
    orbThree: 'radial-gradient(circle, rgba(255, 191, 95, 0.12), transparent 70%)',
    stageBackground:
      'radial-gradient(circle at 18% 12%, rgba(217, 164, 65, 0.18), transparent 26%), radial-gradient(circle at 84% 68%, rgba(74, 144, 217, 0.16), transparent 30%), linear-gradient(145deg, #090f19 0%, #162033 50%, #2b2118 100%)',
    sea: 'rgba(11, 17, 28, 0.94)',
    land: '#253246',
    landAlt: '#314059',
    border: 'rgba(226, 184, 106, 0.58)',
    borderStrong: '#e0ad58',
    glow: 'rgba(226, 184, 106, 0.36)',
    point: '#ffbf5f',
    pointHalo: 'rgba(255, 191, 95, 0.42)',
    label: '#ffe6b8',
    line: '#e0ad58',
    routes: { flight: '#70b7ff', train: '#8de6b4', car: '#ffbf5f', ship: '#7ce3f1' },
    panel: 'rgba(12, 18, 30, 0.76)',
  },
  {
    id: 'vintage',
    name: '复古',
    mood: '像旧票根、纸地图和慢慢走',
    preview: 'linear-gradient(135deg, #efe1bd, #31513f)',
    primary: '#31513f',
    accent: '#a33f2f',
    dark: '#302716',
    light: '#f4ead2',
    pageBackground:
      'radial-gradient(circle at 18% 12%, rgba(49, 81, 63, 0.12), transparent 30%), radial-gradient(circle at 88% 18%, rgba(127, 100, 63, 0.18), transparent 28%), linear-gradient(135deg, #f5edd8 0%, #dac391 52%, #9c7c4f 100%)',
    text: '#302716',
    muted: 'rgba(48, 39, 22, 0.68)',
    panelSoft: 'rgba(248, 239, 218, 0.78)',
    panelStrong: 'rgba(244, 234, 210, 0.9)',
    panelBorder: 'rgba(49, 81, 63, 0.17)',
    accentSoft: 'rgba(49, 81, 63, 0.13)',
    buttonBg: 'rgba(255, 250, 234, 0.72)',
    buttonText: '#302716',
    orbOne: 'radial-gradient(circle, rgba(49, 81, 63, 0.18), transparent 70%)',
    orbTwo: 'radial-gradient(circle, rgba(163, 63, 47, 0.14), transparent 70%)',
    orbThree: 'radial-gradient(circle, rgba(213, 185, 128, 0.26), transparent 70%)',
    stageBackground:
      'radial-gradient(circle at 24% 20%, rgba(49, 81, 63, 0.12), transparent 30%), linear-gradient(145deg, #f4ead2 0%, #d7bf8d 55%, #7f643f 100%)',
    sea: 'rgba(238, 222, 185, 0.72)',
    land: '#d2b77d',
    landAlt: '#ead7a9',
    border: '#7d6540',
    borderStrong: '#31513f',
    glow: 'rgba(49, 81, 63, 0.28)',
    point: '#a33f2f',
    pointHalo: 'rgba(163, 63, 47, 0.34)',
    label: '#3e3321',
    line: '#31513f',
    routes: { flight: '#7b6042', train: '#31513f', car: '#b06f3c', ship: '#527f73' },
    panel: 'rgba(244, 234, 210, 0.84)',
  },
  {
    id: 'aero',
    name: '航线',
    mood: '清爽、明亮，像下一次出发',
    preview: 'linear-gradient(135deg, #dff4ff, #2f8f9d)',
    primary: '#2f8f9d',
    accent: '#ff8a45',
    dark: '#173f49',
    light: '#f7fcff',
    pageBackground:
      'radial-gradient(circle at 12% 8%, rgba(47, 143, 157, 0.16), transparent 30%), radial-gradient(circle at 88% 18%, rgba(255, 138, 69, 0.14), transparent 26%), linear-gradient(135deg, #f8fdff 0%, #dceff6 48%, #b8d5df 100%)',
    text: '#173f49',
    muted: 'rgba(23, 63, 73, 0.68)',
    panelSoft: 'rgba(247, 252, 255, 0.78)',
    panelStrong: 'rgba(241, 250, 253, 0.9)',
    panelBorder: 'rgba(47, 143, 157, 0.16)',
    accentSoft: 'rgba(47, 143, 157, 0.12)',
    buttonBg: 'rgba(255, 255, 255, 0.72)',
    buttonText: '#173f49',
    orbOne: 'radial-gradient(circle, rgba(47, 143, 157, 0.18), transparent 70%)',
    orbTwo: 'radial-gradient(circle, rgba(112, 183, 255, 0.18), transparent 70%)',
    orbThree: 'radial-gradient(circle, rgba(255, 138, 69, 0.16), transparent 70%)',
    stageBackground:
      'radial-gradient(circle at 70% 20%, rgba(47, 143, 157, 0.22), transparent 26%), linear-gradient(145deg, #f7fcff 0%, #d9edf6 48%, #a9c9d8 100%)',
    sea: 'rgba(236, 248, 255, 0.82)',
    land: '#cfe5ec',
    landAlt: '#f5fbff',
    border: '#72a8b8',
    borderStrong: '#2f8f9d',
    glow: 'rgba(47, 143, 157, 0.25)',
    point: '#ff8a45',
    pointHalo: 'rgba(255, 138, 69, 0.36)',
    label: '#275b66',
    line: '#2f8f9d',
    routes: { flight: '#2f8fdf', train: '#3ba986', car: '#ff9b4e', ship: '#24a3b5' },
    panel: 'rgba(247, 252, 255, 0.84)',
  },
]

const activeMapSkinConfig = computed(
  () => mapSkinOptions.find((skin) => skin.id === activeMapSkin.value) || mapSkinOptions[0],
)

const showEmptyGuide = computed(
  () =>
    placesStore.cities.length === 0 &&
    !isLoading.value &&
    !emptyGuideDismissed.value &&
    !editMode.isAuthenticated &&
    !showPasswordModal.value,
)

const mapStageStyle = computed(() => ({
  '--map-stage-bg': activeMapSkinConfig.value.stageBackground,
  '--map-panel-bg': activeMapSkinConfig.value.panel,
  '--map-skin-label': activeMapSkinConfig.value.label,
  '--map-skin-border': activeMapSkinConfig.value.border,
  '--map-skin-glow': activeMapSkinConfig.value.glow,
}))

const isGlobeSpaceView = computed(
  () => viewMode.value === 'map' && !currentProvince.value && !currentCityArea.value && mapZoomLevel.value <= SPACE_VIEW_MAX_ZOOM,
)

// ========== 地图选点功能 ==========

function startPickingLocation() {
  isPickingLocation.value = true
  if (mapInstance) {
    mapInstance.getCanvas().style.cursor = 'crosshair'
  }
}

function cancelPickingLocation() {
  isPickingLocation.value = false
  isResolvingPickedLocation.value = false
  if (mapInstance) {
    mapInstance.getCanvas().style.cursor = 'grab'
  }
  if (pickMarker.value) {
    pickMarker.value.remove()
    pickMarker.value = null
  }
}

function buildPickedLocationMarker() {
  const skin = activeMapSkinConfig.value
  const el = document.createElement('div')
  el.className = 'picked-location-marker'
  el.style.setProperty('--picked-color', skin.point)
  el.style.setProperty('--picked-halo', skin.pointHalo || skin.glow)
  el.style.setProperty('--picked-border', skin.label)
  return el
}

function getFallbackLocationFromMap(point) {
  if (!mapInstance || !point) return {}
  const layers = ['district-fill', 'province-fill', 'china-fill'].filter((layer) => mapInstance.getLayer(layer))
  const features = layers.length ? mapInstance.queryRenderedFeatures(point, { layers }) : []
  const districtFeature = features.find((feature) => feature.layer?.id === 'district-fill')
  const cityFeature = features.find((feature) => feature.layer?.id === 'province-fill')
  const provinceFeature = features.find((feature) => feature.layer?.id === 'china-fill')

  return {
    province: currentProvince.value?.name || provinceFeature?.properties?.name || '',
    city: currentCityArea.value?.name || cityFeature?.properties?.name || '',
    district: districtFeature?.properties?.name || '',
    provinceAdcode: currentProvince.value?.adcode || provinceFeature?.properties?.adcode || '',
    cityAdcode: currentCityArea.value?.adcode || cityFeature?.properties?.adcode || '',
    districtAdcode: districtFeature?.properties?.adcode || '',
  }
}

function applyPickedLocation(lng, lat, location = {}) {
  const fallback = location.fallback || {}
  const provinceName = location.province || fallback.province || currentProvince.value?.name || ''
  const cityName = location.city || fallback.city || location.county || location.town || location.village || location.name || '地图选点'
  const districtName = location.district || location.suburb || location.neighbourhood || location.road || fallback.district || ''
  const province = location.province_id
    ? placesStore.provinces.find((item) => item.id === location.province_id)
    : getProvinceByName(provinceName)

  suppressLocationSync = true
  formData.value.latitude = lat
  formData.value.longitude = lng
  formData.value.province_id = province?.id || currentProvince.value?.id || null
  formData.value.province_name = province?.name || provinceName || currentProvince.value?.name || location.country || ''
  formData.value.city_name = normalizeRegionName(cityName) || cityName
  formData.value.city_adcode = location.city_adcode || fallback.cityAdcode || currentCityArea.value?.adcode || ''
  formData.value.district_name = normalizeRegionName(districtName) || districtName
  formData.value.district_adcode = location.district_adcode || fallback.districtAdcode || ''
  nextTick(() => {
    suppressLocationSync = false
  })
}

async function handleMapClickForLocation(e) {
  if (!isPickingLocation.value) return

  const { lng, lat } = e.lngLat
  isPickingLocation.value = false
  isResolvingPickedLocation.value = true
  if (mapInstance) {
    mapInstance.getCanvas().style.cursor = 'grab'
  }

  // 添加标记点
  if (maplibreGlModule) {
    if (pickMarker.value) {
      pickMarker.value.remove()
    }
    pickMarker.value = new maplibreGlModule.Marker({
      element: buildPickedLocationMarker(),
      anchor: 'bottom',
    })
      .setLngLat([lng, lat])
      .addTo(mapInstance)
  }

  const fallback = getFallbackLocationFromMap(e.point)
  applyPickedLocation(lng, lat, { fallback })
  showAddPanel.value = true

  try {
    const { data } = await reverseGeocode(lat, lng)
    applyPickedLocation(lng, lat, { ...data, fallback })
  } catch (error) {
    const hasFallback = Boolean(formData.value.city_name || formData.value.district_name || formData.value.province_name)
    if (!hasFallback) {
      showToast('已记录坐标，可以直接输入城市或地点名称', 'info', 3200)
    }
  } finally {
    isResolvingPickedLocation.value = false
  }

}

function dismissEmptyGuide() {
  emptyGuideDismissed.value = true
  localStorage.setItem('emptyGuideDismissed', '1')
  requestMapResize(120)
}

function setMapSkin(id) {
  activeMapSkin.value = id
  localStorage.setItem('mapSkin', id)
  if (showThemePanel.value) {
    showThemePanel.value = false
  }
  updateMapView()
  requestMapResize()
}

function createEmptyForm() {
  return {
    city_name: '',
    province_id: null,
    province_name: '',
    city_adcode: '',
    district_name: '',
    district_adcode: '',
    visited_at: '',
    description: '',
    tags: '',
    latitude: null,
    longitude: null,
  }
}

async function loadMapLibreGL() {
  const maplibreGl = await import('maplibre-gl')
  return maplibreGl
}

function normalizeRegionName(name) {
  return (name || '')
    .replace(/特别行政区/g, '')
    .replace(/壮族自治区|回族自治区|维吾尔自治区|自治区/g, '')
    .replace(/地区|盟|自治州/g, '')
    .replace(/省|市|区|县/g, '')
    .trim()
}

function parseTags(tags) {
  return tags ? tags.split(',').map((tag) => tag.trim()).filter(Boolean) : []
}

function formatDate(date) {
  if (!date) return '未记录时间'
  const value = new Date(date)
  if (Number.isNaN(value.getTime())) return '未记录时间'
  return `${value.getFullYear()}.${String(value.getMonth() + 1).padStart(2, '0')}.${String(value.getDate()).padStart(2, '0')}`
}

function cityLabel(city) {
  if (!city) return ''
  const mainName = city.name || city.city_name || '未命名地点'
  const detailName = city.district_name && normalizeRegionName(city.district_name) !== normalizeRegionName(mainName)
    ? city.district_name
    : ''
  return detailName ? `${mainName} · ${detailName}` : mainName
}

function detailLocationText(city) {
  if (!city) return '未归类位置'
  const parts = [city.province_name || currentProvince.value?.name || '未归类省份', city.name]
  if (city.district_name) parts.push(city.district_name)
  return parts.filter(Boolean).join(' · ')
}

function citySummary(city) {
  const tags = parseTags(city.tags)
  if (tags.length) return tags.slice(0, 2).join(' · ')
  if (city.photo_count) return `${city.photo_count} 张照片`
  if (city.description) return '已写旅程故事'
  return '等待补充更多内容'
}

function clusterPhotoCount(records) {
  return records.reduce((sum, record) => sum + (record.photo_count || 0), 0)
}

function clusterDateRange(records) {
  const dates = records
    .map((record) => record.visited_at ? new Date(record.visited_at) : null)
    .filter((date) => date && !Number.isNaN(date.getTime()))
    .sort((a, b) => a - b)

  if (!dates.length) return '未记录时间'
  if (dates.length === 1) return formatDate(dates[0])
  return `${formatDate(dates[0])} - ${formatDate(dates[dates.length - 1])}`
}

function openCluster(records, label) {
  selectedFootprint.value = null
  footprintPhotos.value = []
  placesStore.clearSelection()
  selectedCluster.value = { label, records }
  if (isMobile.value) {
    mobileView.value = 'detail'
  }
}

function appendTag(mode, tag) {
  const target = mode === 'edit' ? editData.value : formData.value
  const tags = parseTags(target.tags)
  if (tags.includes(tag)) return
  tags.push(tag)
  target.tags = tags.join(', ')
}

function buildAiRecords(records = filteredCities.value) {
  return records.slice(0, 36).map((city) => ({
    id: city.id,
    province_name: city.province_name || currentProvince.value?.name || '',
    name: city.name,
    district_name: city.district_name || '',
    visited_at: city.visited_at || '',
    description: city.description || '',
    tags: city.tags || '',
    photo_count: city.photo_count || 0,
  }))
}

function localSemanticSearch(query, records = scopedCities.value) {
  const keywords = query
    .toLowerCase()
    .split(/[\s,，。.!！?？、]+/)
    .map((item) => item.trim())
    .filter(Boolean)

  if (!keywords.length) return []

  return records
    .map((city) => {
      const fields = [
        city.name,
        city.city_name,
        city.district_name,
        city.province_name,
        city.description,
        city.tags,
        formatDate(city.visited_at),
        citySummary(city),
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
      const score = keywords.reduce((sum, keyword) => sum + (fields.includes(keyword) ? 1 : 0), 0)
      return { city, score }
    })
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 8)
    .map((item) => item.city.id)
}

function buildLocalMapSummary(records = filteredCities.value) {
  const source = records.slice(0, 36)
  const tagSet = new Set()
  const cities = new Set()
  let photoCount = 0

  source.forEach((city) => {
    if (city.name) cities.add(city.name)
    photoCount += Number(city.photo_count || 0)
    parseTags(city.tags).forEach((tag) => tagSet.add(tag))
  })

  const firstStory = source.find((city) => city.description)?.description
  const highlights = [
    `${source.length} 段足迹散落在 ${cities.size || source.length} 个地点`,
    `${photoCount} 张照片把路线上的瞬间保留下来`,
    tagSet.size ? `${tagSet.size} 个标签串起这段旅行的情绪` : '还可以继续补充标签和故事',
  ]

  return {
    headline: source.length ? `${currentAiScope.value}的旅行切片` : '等待第一段旅行记忆',
    summary: firstStory
      ? `当前视角里最有画面感的一段记忆是：${safeSummaryText(firstStory)}`
      : source.length
        ? '当前视角已经有足迹记录，可以继续补充照片、标签和旅途备注，让这张地图更像一本会呼吸的旅行手账。'
        : '当前地图视角还没有足迹，可以从地图选点开始记录第一段故事。',
    highlights,
    next_prompt: '可以继续筛选地点，或添加一段新的旅途路线。',
  }
}

function safeSummaryText(text) {
  return String(text || '').replace(/\s+/g, ' ').slice(0, 120)
}

function ensureAiAccess() {
  if (editMode.isAuthenticated) return true
  showSystemNotice('请先解锁编辑模式，再使用 AI 生成能力。', 'error')
  openPasswordModal()
  return false
}

function handleAiAuthExpired() {
  localStorage.removeItem('jwt')
  editMode.isAuthenticated = false
  openPasswordModal()
  showSystemNotice('编辑登录状态已过期，请重新输入密码后再使用 AI。', 'error')
}

async function runAiFootprintDraft() {
  if (!ensureAiAccess() || aiBusy.value.draft) return
  aiBusy.value.draft = true
  try {
    const { data } = await generateFootprintDraft({
      province: currentProvince.value?.name || '',
      city: formData.value.city_name || currentCityArea.value?.name || '',
      district: formData.value.district_name || '',
      address: addLocationSummary.value,
      date: formData.value.visited_at,
      description: formData.value.description,
      tags: formData.value.tags,
      keywords: [formData.value.city_name, formData.value.district_name, formData.value.tags].filter(Boolean).join(', '),
    })

    const title = data.title ? `《${data.title}》` : ''
    formData.value.description = [title, data.description].filter(Boolean).join('\n')
    if (Array.isArray(data.tags) && data.tags.length) {
      formData.value.tags = data.tags.join(', ')
    }
    showToast('AI 已生成足迹文案')
  } catch (error) {
    showSystemNotice(error.response?.data?.error || 'AI 生成失败，请稍后再试。', 'error')
  } finally {
    aiBusy.value.draft = false
  }
}

async function runAiMapSummary() {
  if (!ensureAiAccess() || aiBusy.value.summary) return
  aiBusy.value.summary = true
  try {
    const { data } = await generateMapSummary({
      scope: currentAiScope.value,
      records: buildAiRecords(),
    })
    aiMapSummary.value = data
    showToast('AI 已总结当前视角')
  } catch (error) {
    aiMapSummary.value = buildLocalMapSummary()
    if (error.response?.status === 401) {
      handleAiAuthExpired()
    } else {
      showSystemNotice(error.response?.data?.error || 'AI 服务暂时不可用，已先生成本地视角总结。', 'error')
    }
  } finally {
    aiBusy.value.summary = false
  }
}

async function runAiSearch() {
  if (aiBusy.value.search) return
  const query = aiSearchQuery.value.trim()
  if (!query) {
    showSystemNotice('先输入想找的旅行记忆，比如“下雨天去过的地方”。', 'error')
    return
  }

  aiBusy.value.search = true
  try {
    let data = null
    if (editMode.isAuthenticated) {
      const response = await searchFootprintsWithAi({
        query,
        records: buildAiRecords(scopedCities.value),
      })
      data = response.data
    }
    const aiIds = Array.isArray(data?.matched_ids) ? data.matched_ids : []
    const ids = aiIds.length ? aiIds : localSemanticSearch(query, scopedCities.value)
    aiMatchedIds.value = ids
    aiSearchReason.value = data?.reason || (ids.length ? `已找到 ${ids.length} 条相关足迹` : '暂时没有找到相关足迹')
    if (ids.length) {
      searchQuery.value = ''
      activeFilter.value = 'all'
      activeYear.value = 'all'
      const matched = placesStore.cities.filter((city) => ids.includes(city.id))
      if (matched[0]) {
        await selectFootprint(matched[0].id)
      }
    }
  } catch (error) {
    if (error.response?.status === 401) {
      handleAiAuthExpired()
    }
    const ids = localSemanticSearch(query, scopedCities.value)
    aiMatchedIds.value = ids
    aiSearchReason.value = ids.length
      ? `已用本地索引找到 ${ids.length} 条相关足迹，AI 服务恢复后会自动使用语义搜索`
      : '暂时没有找到相关足迹，AI 服务恢复后可以再试一次'
    if (ids.length) {
      searchQuery.value = ''
      activeFilter.value = 'all'
      activeYear.value = 'all'
      const matched = placesStore.cities.filter((city) => ids.includes(city.id))
      if (matched[0]) {
        await selectFootprint(matched[0].id)
      }
    } else {
      showSystemNotice(error.response?.data?.error || 'AI 搜索失败，且本地没有匹配结果。', 'error')
    }
  } finally {
    aiBusy.value.search = false
  }
}

async function runAiJourneyTitle() {
  if (!ensureAiAccess() || aiBusy.value.journey || !canSubmitJourney.value) return
  aiBusy.value.journey = true
  try {
    const { data } = await generateJourneyTitle({
      journey: {
        from_city_name: getCityNameById(journeyFormData.value.from_city_id),
        to_city_name: getCityNameById(journeyFormData.value.to_city_id),
        transport_type: journeyFormData.value.transport_type,
        transport_name: journeyFormData.value.transport_name,
        departure_time: journeyFormData.value.departure_time,
        arrival_time: journeyFormData.value.arrival_time,
        notes: journeyFormData.value.notes,
      },
    })
    if (data.title && !journeyFormData.value.transport_name) {
      journeyFormData.value.transport_name = data.title
    }
    if (data.note) {
      journeyFormData.value.notes = data.note
    }
    showToast('AI 已生成路线文案')
  } catch (error) {
    showSystemNotice(error.response?.data?.error || 'AI 路线命名失败，请稍后再试。', 'error')
  } finally {
    aiBusy.value.journey = false
  }
}

function getThemePreviewStyle(theme) {
  return {
    '--preview-primary': theme.primary,
    '--preview-accent': theme.accent,
    '--preview-light': theme.light,
    '--preview-bg': theme.stageBackground,
  }
}

const appStyle = computed(() => {
  const theme = activeMapSkinConfig.value
  return {
    '--primary': theme.primary,
    '--accent': theme.accent,
    '--dark': theme.dark,
    '--light': theme.light,
    '--page-background': theme.pageBackground,
    '--text-main': theme.text,
    '--text-muted': theme.muted,
    '--panel-soft-bg': theme.panelSoft,
    '--panel-strong-bg': theme.panelStrong,
    '--panel-border': theme.panelBorder,
    '--accent-soft': theme.accentSoft,
    '--button-bg': theme.buttonBg,
    '--button-text': theme.buttonText,
    '--orb-one': theme.orbOne,
    '--orb-two': theme.orbTwo,
    '--orb-three': theme.orbThree,
  }
})

const currentViewName = computed(() => {
  if (currentCityArea.value) return `${currentCityArea.value.name} 的角落`
  if (currentProvince.value) return `${currentProvince.value.name} 的一路风景`
  return '我们的旅行星球'
})

const currentViewBadge = computed(() => {
  if (currentCityArea.value) return '区县记忆'
  if (currentProvince.value) return '城市漫游'
  return '世界相册'
})

const currentViewDescription = computed(() => {
  if (currentCityArea.value) {
    return '把一座城市拆成更小的片段：街区、公园、车站、海边，以及只有你们知道的某个转角。'
  }
  if (currentProvince.value) {
    return '这一省里藏着很多次出发。点开城市，就能看见更贴近当时心情的地方。'
  }
  return '从第一座城市到下一片大陆，把你们一起抵达过的地方，慢慢点亮成一颗会呼吸的星球。'
})

const breadcrumbTrail = computed(() => {
  const trail = [{ id: 'china', label: '世界', active: !currentProvince.value && !currentCityArea.value }]
  if (currentProvince.value) {
    trail.push({ id: 'province', label: currentProvince.value.name, active: !currentCityArea.value })
  }
  if (currentCityArea.value) {
    trail.push({ id: 'city', label: currentCityArea.value.name, active: true })
  }
  return trail
})

const visibleBreadcrumbTrail = computed(() => {
  if (!currentProvince.value && !currentCityArea.value) return []
  return breadcrumbTrail.value.filter((crumb) => !crumb.active)
})

const mapStageTitle = computed(() => {
  if (currentCityArea.value) return `${currentCityArea.value.name} · 细碎日光`
  if (currentProvince.value) return `${currentProvince.value.name} · 城市片段`
  return '世界足迹星球'
})

const currentActionHint = computed(() => {
  if (currentCityArea.value) {
    return editMode.isAuthenticated
      ? '点一个区县，把那天的照片、天气和心情放在原来的地方。'
      : '这里适合重看一座城市里的小地方，那些不像景点、却很像你们的瞬间。'
  }
  if (currentProvince.value) {
    return '点开一座城市，看看这趟旅程在更细的地方留下了什么。'
  }
  if (isMobile.value) {
    return '拖动旋转地球，双指捏合缩放地图；普通上下滑继续浏览页面。'
  }
  return '拖动旋转地球，鼠标停在地图内滚轮缩放；足迹、照片和旅途路线会沿着经纬度浮在星球表面。'
})

const currentLayerMetric = computed(() => {
  if (currentCityArea.value) return `${availableDistricts.value.length || 0} 个区县单元`
  if (currentProvince.value) return `${availableCities.value.length || 0} 个城市单元`
  return `${filteredCities.value.length || placesStore.cities.length || 0} 个世界坐标`
})

const currentActionShort = computed(() => {
  if (currentCityArea.value) return '把记忆放进角落'
  if (currentProvince.value) return '走进城市里面'
  return '拖动这颗星球'
})

const mapOverlayTitle = computed(() => {
  if (currentCityArea.value) return '这座城，有你们的具体坐标'
  if (currentProvince.value) return '每座城市，都是一段不同的章节'
  return '把一起走过的世界，慢慢点亮'
})

const mapOverlayDescription = computed(() => {
  if (currentCityArea.value) {
    return '不是只记得去过某座城，而是记得那条路、那顿饭、那场雨，以及照片背后的笑。'
  }
  if (currentProvince.value) {
    return '省份像一本翻开的章节，城市是页码，区县是夹在里面的票根和照片。'
  }
  return '这不是路线打卡表，而是一份共同生活的地理索引：去过哪里，也记得为什么难忘；以后走到世界任何城市，都能继续落在这颗星球上。'
})

const emptyDetailTitle = computed(() => {
  if (currentCityArea.value) return '等一段具体的小记忆'
  if (currentProvince.value) return '选一座城市，翻开下一页'
  return '先从地图里点亮第一段故事'
})

const emptyDetailDescription = computed(() => {
  if (currentCityArea.value) {
    return '也许是一次散步、一次赶路、一次临时起意。等你们把它写下来，这里就会有光。'
  }
  if (currentProvince.value) {
    return '每座城市都有自己的语气。点开它，再把记忆放到更准确的位置。'
  }
  return '可以从一个省份开始，也可以等下一次旅行结束后，再把新的章节补上。'
})

const collectionTip = computed(() => {
  if (currentCityArea.value) {
    return '这里收着这座城市里更小的停留，适合慢慢对照每一段发生的位置。'
  }
  if (currentProvince.value) {
    return '这一省里的记录都会在这里汇合，像一本按城市分好的旅行手账。'
  }
  return '所有旧日子都按地点收好，想念哪一段，就从这里再走进去。'
})

const currentAiScope = computed(() => {
  if (currentCityArea.value) return `${currentProvince.value?.name || ''} · ${currentCityArea.value.name}`
  if (currentProvince.value) return currentProvince.value.name
  return '世界足迹星球'
})

const visitedProvinces = computed(() => {
  const provinceIds = placesStore.cities.map((city) => city.province_id).filter(Boolean)
  return [...new Set(provinceIds)].length
})

const totalPhotos = computed(() =>
  placesStore.cities.reduce((sum, city) => sum + (city.photo_count || 0), 0),
)

const scopedCities = computed(() => {
  if (currentCityArea.value) {
    return placesStore.cities.filter((city) => city.city_adcode === currentCityArea.value.adcode)
  }
  if (currentProvince.value) {
    return placesStore.cities.filter((city) => city.province_id === currentProvince.value.id)
  }
  return placesStore.cities
})

const filteredCities = computed(() => {
  let source = scopedCities.value.slice()
  const query = searchQuery.value.trim().toLowerCase()

  if (aiMatchedIds.value.length) {
    const matched = new Set(aiMatchedIds.value)
    source = source.filter((city) => matched.has(city.id))
  }

  if (query) {
    source = source.filter((city) => {
      const fields = [
        city.name,
        city.district_name,
        city.province_name,
        cityLabel(city),
        detailLocationText(city),
        city.city_adcode,
        city.district_adcode,
        city.province_adcode,
        city.description,
        city.tags,
      ]
      return fields.filter(Boolean).some((field) => String(field).toLowerCase().includes(query))
    })
  }

  if (activeYear.value !== 'all') {
    source = source.filter((city) => {
      if (!city.visited_at) return false
      return String(new Date(city.visited_at).getFullYear()) === String(activeYear.value)
    })
  }

  switch (activeFilter.value) {
    case 'photos':
      return source.filter((city) => (city.photo_count || 0) > 0)
    case 'notes':
      return source.filter((city) => city.description && city.description.trim())
    case 'tagged':
      return source.filter((city) => parseTags(city.tags).length > 0)
    case 'district':
      return source.filter((city) => city.district_name)
    default:
      return source
  }
})

const regionStatsTitle = computed(() => {
  if (currentCityArea.value) return `${currentCityArea.value.name} 区县记忆概览`
  if (currentProvince.value) return `${currentProvince.value.name} 旅行密度`
  return '世界旅行资产'
})

const regionStats = computed(() => {
  const source = filteredCities.value
  const tagSet = new Set()
  const dates = []

  source.forEach((city) => {
    parseTags(city.tags).forEach((tag) => tagSet.add(tag))
    if (city.visited_at) dates.push(new Date(city.visited_at))
  })

  const sortedDates = dates
    .filter((date) => !Number.isNaN(date.getTime()))
    .sort((a, b) => a - b)
  const range = sortedDates.length
    ? `${formatDate(sortedDates[0])} 至 ${formatDate(sortedDates[sortedDates.length - 1])}`
    : '还没有形成时间跨度'

  return {
    records: source.length,
    photos: source.reduce((sum, city) => sum + (city.photo_count || 0), 0),
    tags: tagSet.size,
    range,
  }
})

const yearOptions = computed(() => {
  const years = scopedCities.value
    .map((city) => city.visited_at ? new Date(city.visited_at).getFullYear() : null)
    .filter((year) => year && !Number.isNaN(year))
  return [...new Set(years)].sort((a, b) => b - a)
})

const footprintGroups = computed(() => {
  const groups = new Map()

  filteredCities.value.forEach((city) => {
    const key = city.district_adcode
      ? `district:${city.district_adcode}`
      : city.city_adcode
        ? `city:${city.city_adcode}`
        : `legacy:${city.province_id || 'none'}:${normalizeRegionName(city.name)}`

    if (!groups.has(key)) {
      groups.set(key, {
        key,
        label: city.district_name ? `${city.name} · ${city.district_name}` : city.name,
        longitude: city.longitude || 0,
        latitude: city.latitude || 0,
        records: [],
      })
    }

    groups.get(key).records.push(city)
  })

  return Array.from(groups.values()).map((group) => ({
    ...group,
    photo_count: group.records.reduce((sum, record) => sum + (record.photo_count || 0), 0),
  }))
})

const filterOptions = computed(() => {
  const source = scopedCities.value
  return [
    { id: 'all', label: '全部', count: source.length },
    { id: 'photos', label: '有照片', count: source.filter((city) => (city.photo_count || 0) > 0).length },
    { id: 'notes', label: '有故事', count: source.filter((city) => city.description && city.description.trim()).length },
    { id: 'tagged', label: '有标签', count: source.filter((city) => parseTags(city.tags).length > 0).length },
    { id: 'district', label: '区县级', count: source.filter((city) => city.district_name).length },
  ]
})

const timelineCities = computed(() =>
  filteredCities.value
    .slice()
    .sort((a, b) => new Date(b.visited_at || 0) - new Date(a.visited_at || 0))
    .slice(0, 6),
)

const timelineGroups = computed(() => {
  const groups = new Map()

  filteredCities.value
    .slice()
    .sort((a, b) => new Date(b.visited_at || 0) - new Date(a.visited_at || 0))
    .forEach((city) => {
      const parsedYear = city.visited_at ? new Date(city.visited_at).getFullYear() : null
      const year = parsedYear && !Number.isNaN(parsedYear) ? parsedYear : '未定'
      if (!groups.has(year)) groups.set(year, [])
      groups.get(year).push(city)
    })

  return Array.from(groups.entries()).map(([year, items]) => ({ year, items }))
})

const availableCities = computed(() => {
  if (!currentProvince.value || currentCityArea.value) return []
  const geoData = provinceGeoCache.value[currentProvince.value.adcode]
  if (!geoData?.features) return []
  return geoData.features.map((feature) => ({
    value: normalizeRegionName(feature.properties?.name || feature.name || ''),
    label: normalizeRegionName(feature.properties?.name || feature.name || ''),
    adcode: feature.properties?.adcode ? String(feature.properties.adcode) : '',
    center: feature.properties?.center || feature.properties?.centroid || null,
  }))
})

const availableDistricts = computed(() => {
  if (!currentCityArea.value) return []
  const geoData = districtGeoCache.value[currentCityArea.value.adcode]
  if (!geoData?.features) return []
  return geoData.features.map((feature) => ({
    value: normalizeRegionName(feature.properties?.name || feature.name || ''),
    label: normalizeRegionName(feature.properties?.name || feature.name || ''),
    adcode: feature.properties?.adcode ? String(feature.properties.adcode) : '',
    center: feature.properties?.center || feature.properties?.centroid || null,
  }))
})

const detailHeroStyle = computed(() => {
  const activePhoto = footprintPhotos.value[currentPhotoIndex.value]
  if (!activePhoto?.file_path) {
    return {
      background: 'linear-gradient(135deg, rgba(47,33,22,0.95), rgba(125,89,52,0.82))',
    }
  }
  return {
    backgroundImage: `linear-gradient(180deg, rgba(20, 12, 8, 0.08), rgba(20, 12, 8, 0.32)), url("${activePhoto.file_path}")`,
  }
})

const activePhoto = computed(() => footprintPhotos.value[currentPhotoIndex.value] || null)

const tooltipStyle = computed(() => ({
  left: `${tooltipPosition.value.x}px`,
  top: `${tooltipPosition.value.y}px`,
}))

const addLocationSummary = computed(() => {
  if (isResolvingPickedLocation.value) return '正在根据地图选点识别地址...'
  const pickedParts = [
    formData.value.province_name,
    formData.value.city_name,
    formData.value.district_name,
  ].filter(Boolean)
  if (pickedParts.length) return pickedParts.join(' · ')
  if (currentCityArea.value) {
    return `${currentCityArea.value.name} · ${formData.value.district_name || '请选择或点击区县'}`
  }
  if (!currentProvince.value) return '可以直接在地球上选点，系统会自动识别城市和地点。'
  if (formData.value.city_name) return `${formData.value.province_name || currentProvince.value.name} · ${formData.value.city_name}`
  return `${currentProvince.value.name} · 还没有定位到具体城市`
})

const formHeaderText = computed(() => {
  if (currentCityArea.value) {
    return `${currentProvince.value?.name || ''} · ${currentCityArea.value.name} · ${formData.value.district_name || '选择区县后开始记录'}`
  }
  if (currentProvince.value) {
    return `${currentProvince.value.name} · ${formData.value.city_name || '选择城市后开始记录'}`
  }
  return formData.value.city_name ? addLocationSummary.value : '在地球上选点后开始记录'
})

const editLocationSummary = computed(() => {
  if (!editingFootprint.value) return '选择足迹后，这里会显示当前记录状态。'
  return `${editingFootprint.value.district_name || editingFootprint.value.name} · ${editingFootprint.value.photo_count || 0} 张原有照片`
})

const canSubmitFootprint = computed(() => {
  if (!formData.value.city_name) return false
  if (!formData.value.visited_at) return false
  if (currentCityArea.value && !formData.value.district_name) return false
  return formData.value.latitude !== null && formData.value.longitude !== null
})

function getProvinceByName(name) {
  const normalized = normalizeRegionName(name)
  return placesStore.provinces.find((province) => {
    const target = normalizeRegionName(province.name)
    return target === normalized || normalized.includes(target) || target.includes(normalized)
  })
}

function handleBreadcrumbClick(id) {
  if (id === 'china') {
    backToChina()
    return
  }
  if (id === 'province') {
    backToProvince()
  }
}

function openPasswordModal() {
  if (!editMode.token) {
    editMode.token = 'travel2024love'
  }
  editMode.isEditMode = true
  authError.value = ''
  showPasswordModal.value = true
}

function findCityFeatureByName(name) {
  if (!currentProvince.value) return null
  const geoData = provinceGeoCache.value[currentProvince.value.adcode]
  const normalized = normalizeRegionName(name)
  return geoData?.features?.find((feature) => {
    const featureName = normalizeRegionName(feature.properties?.name || feature.name || '')
    return featureName === normalized
  }) || null
}

function getDistrictFeatureByName(name) {
  if (!currentCityArea.value) return null
  const geoData = districtGeoCache.value[currentCityArea.value.adcode]
  const normalized = normalizeRegionName(name)
  return geoData?.features?.find((feature) => {
    const featureName = normalizeRegionName(feature.properties?.name || feature.name || '')
    return featureName === normalized
  }) || null
}

async function submitPassword() {
  if (!passwordInput.value) return
  authError.value = ''
  await editMode.login(passwordInput.value)
  if (editMode.isAuthenticated) {
    dismissEmptyGuide()
    showPasswordModal.value = false
    passwordInput.value = ''
    requestMapResize(160)
    return
  }
  authError.value = editMode.error || '登录失败'
}

function addFiles(files) {
  const imageFiles = files.filter((file) => file.type.startsWith('image/'))
  pendingPhotos.value.push(
    ...imageFiles.map((file) => ({
      file,
      preview: URL.createObjectURL(file),
    })),
  )
}

function handleUpload(event) {
  addFiles(Array.from(event.target.files || []))
  event.target.value = ''
}

function onDrop(event) {
  isDragover.value = false
  addFiles(Array.from(event.dataTransfer.files || []))
}

function clearPendingPhotos() {
  pendingPhotos.value.forEach((photo) => URL.revokeObjectURL(photo.preview))
  pendingPhotos.value = []
}

function removePending(index) {
  const photo = pendingPhotos.value[index]
  if (photo) URL.revokeObjectURL(photo.preview)
  pendingPhotos.value.splice(index, 1)
}

function closeAddPanel() {
  showAddPanel.value = false
  clearPendingPhotos()
  formData.value = createEmptyForm()
}

function closeEditPanel() {
  showEditPanel.value = false
  editingFootprint.value = null
  clearPendingPhotos()
}

function openQuickAdd() {
  if (!editMode.isAuthenticated) return
  // 如果有当前省份，自动填充省份信息
  if (currentProvince.value) {
    formData.value.province_id = currentProvince.value.id
    formData.value.province_name = currentProvince.value.name
  }
  formData.value.city_name = currentCityArea.value?.name || ''
  formData.value.city_adcode = currentCityArea.value?.adcode || ''
  showAddPanel.value = true
}

async function submitFootprint() {
  if (!canSubmitFootprint.value) return
  isLoading.value = true
  loadingText.value = '保存足迹中...'

  try {
    const footprintId = await placesStore.addCity({
      province_id: formData.value.province_id,
      name: formData.value.city_name,
      city_adcode: formData.value.city_adcode || null,
      district_name: formData.value.district_name || null,
      district_adcode: formData.value.district_adcode || null,
      latitude: formData.value.latitude,
      longitude: formData.value.longitude,
      visited_at: formData.value.visited_at,
      description: formData.value.description,
      tags: formData.value.tags,
    })

    if (pendingPhotos.value.length) {
      await uploadPhotos(
        footprintId,
        pendingPhotos.value.map((photo) => photo.file),
      )
    }

    closeAddPanel()
    await placesStore.fetchPlaces()
    updateMapView()
    await selectFootprint(footprintId)
    showToast('足迹已保存', 'success')
  } catch (error) {
    showToast('保存失败，请重试', 'error')
  } finally {
    isLoading.value = false
  }
}

function editFootprint(footprint) {
  editingFootprint.value = footprint
  editData.value = {
    visited_at: footprint.visited_at || '',
    description: footprint.description || '',
    tags: footprint.tags || '',
  }
  showEditPanel.value = true
}

async function updateFootprint() {
  if (!editingFootprint.value) return
  isLoading.value = true
  loadingText.value = '更新足迹中...'

  try {
    await placesStore.updateCity(editingFootprint.value.id, {
      name: editingFootprint.value.name,
      city_adcode: editingFootprint.value.city_adcode || null,
      district_name: editingFootprint.value.district_name || null,
      district_adcode: editingFootprint.value.district_adcode || null,
      latitude: editingFootprint.value.latitude,
      longitude: editingFootprint.value.longitude,
      visited_at: editData.value.visited_at,
      description: editData.value.description,
      tags: editData.value.tags,
      province_id: editingFootprint.value.province_id,
    })

    if (pendingPhotos.value.length) {
      await uploadPhotos(
        editingFootprint.value.id,
        pendingPhotos.value.map((photo) => photo.file),
      )
    }

    const updatedId = editingFootprint.value.id
    closeEditPanel()
    await placesStore.fetchPlaces()
    updateMapView()
    await selectFootprint(updatedId)
    showToast('足迹已更新', 'success')
  } catch (error) {
    showToast('更新失败，请重试', 'error')
  } finally {
    isLoading.value = false
  }
}

async function confirmDelete(id) {
  if (!window.confirm('确定删除这条足迹吗？')) return
  isLoading.value = true
  loadingText.value = '删除足迹中...'

  try {
    await placesStore.deleteCity(id)
    selectedFootprint.value = null
    footprintPhotos.value = []
    updateMapView()
    showToast('足迹已删除', 'success')
  } catch (error) {
    showToast('删除失败，请重试', 'error')
  } finally {
    isLoading.value = false
  }
}

async function selectFootprint(id) {
  isLoading.value = true
  loadingText.value = '加载足迹中...'

  try {
    await placesStore.selectCity(id)
    selectedFootprint.value = placesStore.selectedCity
    selectedCluster.value = null
    footprintPhotos.value = placesStore.cityPhotos
    currentPhotoIndex.value = 0

    const city = placesStore.cities.find((item) => item.id === id)
    if (city) focusMapOnFootprint(city)
    if (isMobile.value) {
      mobileView.value = 'detail'
    }
  } finally {
    isLoading.value = false
  }
}

async function refreshSelectedFootprint() {
  if (!selectedFootprint.value?.id) return
  await selectFootprint(selectedFootprint.value.id)
  await placesStore.fetchPlaces()
  updateMapView()
}

async function markActivePhotoAsCover() {
  if (!editMode.isAuthenticated || !activePhoto.value) return
  await setCoverPhoto(activePhoto.value.id)
  await refreshSelectedFootprint()
}

async function moveActivePhoto(direction) {
  if (!editMode.isAuthenticated || !activePhoto.value) return
  const nextIndex = currentPhotoIndex.value + direction
  if (nextIndex < 0 || nextIndex >= footprintPhotos.value.length) return

  const reordered = footprintPhotos.value.slice()
  const [photo] = reordered.splice(currentPhotoIndex.value, 1)
  reordered.splice(nextIndex, 0, photo)
  footprintPhotos.value = reordered
  currentPhotoIndex.value = nextIndex

  await updatePhotoOrder(selectedFootprint.value.id, reordered.map((item) => item.id))
  await refreshSelectedFootprint()
}

async function removeActivePhoto() {
  if (!editMode.isAuthenticated || !activePhoto.value) return
  if (!window.confirm('确定删除这张照片吗？')) return

  await deletePhoto(activePhoto.value.id)
  currentPhotoIndex.value = Math.max(0, currentPhotoIndex.value - 1)
  await refreshSelectedFootprint()
}

function closeFootprintPanel() {
  selectedFootprint.value = null
  selectedCluster.value = null
  footprintPhotos.value = []
  placesStore.clearSelection()
}

function focusMapOnFootprint(city) {
  if (!mapInstance) return
  globeAutoRotate = false
  const targetZoom = currentCityArea.value ? 12 : currentProvince.value ? 8 : 5
  mapInstance.flyTo({ center: [Number(city.longitude), Number(city.latitude)], zoom: targetZoom, duration: 1200 })
}

function resetGlobeView() {
  globeAutoRotate = true
  if (!mapInstance) return
  mapInstance.flyTo({ center: DEFAULT_GLOBE_CENTER, zoom: getDefaultMapZoom(), duration: 1500 })
}

function getDefaultMapZoom() {
  if (currentCityArea.value) return 12
  if (currentProvince.value) return 7
  return isMobile.value ? MOBILE_GLOBE_ZOOM : DEFAULT_GLOBE_ZOOM
}

function getMinMapZoom() {
  if (currentCityArea.value) return 10
  if (currentProvince.value) return 5
  return 0.7
}

function getCurrentMapZoom() {
  return mapInstance?.getZoom() || getDefaultMapZoom()
}

function syncMapZoomLevel() {
  mapZoomLevel.value = getCurrentMapZoom()
}

function clampMapZoom(zoom) {
  return Math.min(Math.max(zoom, getMinMapZoom()), 18)
}

function applyMapZoom(zoom) {
  if (!mapInstance) return
  mapInstance.setZoom(clampMapZoom(zoom))
}

function setMapZoom(zoom) {
  if (!mapInstance) return
  const target = clampMapZoom(zoom)
  mapInstance.setZoom(target)
}

function zoomIn() {
  setMapZoom(getCurrentMapZoom() * 1.3)
}

function zoomOut() {
  setMapZoom(getCurrentMapZoom() / 1.3)
}

function resetView() {
  resetGlobeView()
  if (!mapInstance) return

  if (currentCityArea.value) {
    mapInstance.flyTo({ center: currentCityArea.value.center, zoom: 12, duration: 800 })
    return
  }

  if (currentProvince.value) {
    mapInstance.flyTo({ center: [currentProvince.value.center_lon, currentProvince.value.center_lat], zoom: 7, duration: 800 })
    return
  }

  mapInstance.flyTo({ center: DEFAULT_GLOBE_CENTER, zoom: getDefaultMapZoom(), duration: 800 })
}

async function loadProvinceMap(province) {
  if (!province?.adcode || !mapInstance) return
  isLoading.value = true
  loadingText.value = `进入 ${province.name}...`
  mapTransitioning.value = true
  transitionText.value = `进入 ${province.name}`
  globeAutoRotate = false

  // 清除省份标注（进入省份视图）
  clearProvinceLabelMarkers()

  try {
    // 加载省级 GeoJSON 用于高亮显示
    if (!provinceGeoCache.value[province.adcode]) {
      const response = await fetch(`/provinces/${province.adcode}.json`)
      provinceGeoCache.value[province.adcode] = await response.json()
    }

    // 添加省级边界图层
    updateProvinceBoundaryLayer(provinceGeoCache.value[province.adcode])

    currentProvince.value = province
    currentCityArea.value = null
    activeFilter.value = 'all'
    closeFootprintPanel()

    // 飞到省份中心
    mapInstance.flyTo({
      center: [province.center_lon, province.center_lat],
      zoom: 7,
      duration: 1200,
    })

    updateFootprintMarkers()
  } finally {
    isLoading.value = false
    window.setTimeout(() => {
      mapTransitioning.value = false
    }, 260)
  }
}

async function loadDistrictMap(cityFeature) {
  const cityAdcode = cityFeature?.properties?.adcode ? String(cityFeature.properties.adcode) : ''
  if (!cityAdcode || !mapInstance) return

  isLoading.value = true
  loadingText.value = `进入 ${cityFeature.properties?.name || ''}...`
  mapTransitioning.value = true
  transitionText.value = `进入 ${normalizeRegionName(cityFeature.properties?.name || '')}`
  globeAutoRotate = false

  try {
    // 加载区县级 GeoJSON
    if (!districtGeoCache.value[cityAdcode]) {
      const response = await fetch(`/api/places/geo/cities/${cityAdcode}/districts`)
      districtGeoCache.value[cityAdcode] = await response.json()
    }

    // 更新区县边界图层
    updateDistrictBoundaryLayer(districtGeoCache.value[cityAdcode])

    currentCityArea.value = {
      name: normalizeRegionName(cityFeature.properties?.name || ''),
      adcode: cityAdcode,
      center: cityFeature.properties?.center || cityFeature.properties?.centroid || [currentProvince.value.center_lon, currentProvince.value.center_lat],
    }
    activeFilter.value = 'all'
    closeFootprintPanel()

    // 飞到区县中心
    const center = cityFeature.properties?.center || cityFeature.properties?.centroid || [currentProvince.value.center_lon, currentProvince.value.center_lat]
    mapInstance.flyTo({
      center: center,
      zoom: 12,
      duration: 1200,
    })

    updateFootprintMarkers()
  } finally {
    isLoading.value = false
    window.setTimeout(() => {
      mapTransitioning.value = false
    }, 260)
  }
}

function backToChina() {
  if (!mapInstance) return
  mapTransitioning.value = true
  transitionText.value = '世界视角'
  currentProvince.value = null
  currentCityArea.value = null
  activeFilter.value = 'all'
  closeFootprintPanel()

  // 移除省级和区县级边界图层
  removeBoundaryLayers()
  globeAutoRotate = true

  // 飞回全球视角
  mapInstance.flyTo({
    center: DEFAULT_GLOBE_CENTER,
    zoom: getDefaultMapZoom(),
    duration: 1500,
  })

  updateFootprintMarkers()
  window.setTimeout(() => {
    mapTransitioning.value = false
  }, 260)
}

function backToProvince() {
  if (!mapInstance || !currentProvince.value) return
  mapTransitioning.value = true
  transitionText.value = `退到 ${currentProvince.value?.name || '省份'}`
  currentCityArea.value = null
  activeFilter.value = 'all'
  closeFootprintPanel()

  // 移除区县边界图层，恢复省级边界
  removeDistrictBoundaryLayer()

  // 飞回省级视角
  mapInstance.flyTo({
    center: [currentProvince.value.center_lon, currentProvince.value.center_lat],
    zoom: 7,
    duration: 1200,
  })

  updateFootprintMarkers()
  window.setTimeout(() => {
    mapTransitioning.value = false
  }, 260)
}

function buildScatterData(groups) {
  return groups.map((group) => ({
    id: group.records[0]?.id,
    name: group.label,
    value: [group.longitude || 0, group.latitude || 0, group.photo_count || 0],
    records: group.records,
    symbolSizeValue: group.records.length,
  }))
}

function buildLineData(cities) {
  const sorted = cities
    .slice()
    .filter((city) => city.longitude && city.latitude)
    .sort((a, b) => new Date(a.visited_at || 0) - new Date(b.visited_at || 0))

  return sorted.slice(1).map((city, index) => ({
    coords: [
      [sorted[index].longitude, sorted[index].latitude],
      [city.longitude, city.latitude],
    ],
  }))
}

// 旅程路线构建 - 按交通类型分组
const transportConfig = {
  flight: { color: '#4A90D9', lift: 0.36, wave: 0, speed: 0.008, dash: [1.6, 1.2], height: 1 },
  train: { color: '#4A9B7C', lift: 0.02, wave: 0, speed: 0.006, dash: [2, 2], height: 0 },
  car: { color: '#F6AD55', lift: 0.08, wave: 0.12, speed: 0.005, dash: [1, 1.4], height: 0 },
  ship: { color: '#2C5F4D', lift: 0.1, wave: 0.18, speed: 0.004, dash: [3, 1.2], height: 0 },
}

function buildJourneyLineData(journeys, transportType) {
  return journeys
    .filter(j => j.transport_type === transportType && j.from_lon && j.from_lat && j.to_lon && j.to_lat)
    .map(j => ({
      id: j.id,
      coords: [[j.from_lon, j.from_lat], [j.to_lon, j.to_lat]],
      journey: j,
    }))
}

function getTransportSymbol(type) {
  switch (type) {
    case 'flight': return 'path://M1.2,20L20,1.2l3.8,3.8L5,20l15-5l-3.8-3.8L1.2,20z'
    case 'train': return 'path://M2,20h20v-4H2V20z M4,16h16v-2H4V16z M6,12h12v-2H6V12z'
    case 'car': return 'path://M3,18h18v-3H3V18z M5,15h14v-2H5V15z M7,12h10l-2-4H9L7,12z'
    case 'ship': return 'path://M2,20h20l-4-8H6L2,20z M4,16h16v-2H4V16z'
    default: return 'circle'
  }
}

function getTransportMapIcon(type) {
  switch (type) {
    case 'flight': return '✈'
    case 'train': return '🚆'
    case 'car': return '🚗'
    case 'ship': return '⛴'
    default: return '•'
  }
}

function getTransportIconSvg(type) {
  const icons = {
    flight:
      '<svg viewBox="0 0 32 32" aria-hidden="true"><path d="M3 18.4 29 4.2c.8-.4 1.6.4 1.1 1.2L15.7 30l-3.1-9.7-8.8 2.2L3 18.4Zm10.4-1.5 2 6.2L24 8.5l-12 8.4 1.4.0Z"/></svg>',
    train:
      '<svg viewBox="0 0 32 32" aria-hidden="true"><path d="M9 3h14c2.2 0 4 1.8 4 4v13.5c0 2.1-1.7 3.8-3.8 3.8L26 29h-4l-2-3.4h-8L10 29H6l2.8-4.7A3.8 3.8 0 0 1 5 20.5V7c0-2.2 1.8-4 4-4Zm1 5v6h12V8H10Zm1 11.5a2 2 0 1 0 0 4 2 2 0 0 0 0-4Zm10 0a2 2 0 1 0 0 4 2 2 0 0 0 0-4Z"/></svg>',
    car:
      '<svg viewBox="0 0 32 32" aria-hidden="true"><path d="M7.2 12.5 9.4 7c.5-1.2 1.6-2 2.9-2h7.4c1.3 0 2.4.8 2.9 2l2.2 5.5A4.5 4.5 0 0 1 29 17v6h-3v3h-4v-3H10v3H6v-3H3v-6a4.5 4.5 0 0 1 4.2-4.5ZM11 8l-1.6 4h13.2L21 8H11Zm-2 8.8a2.2 2.2 0 1 0 0 4.4 2.2 2.2 0 0 0 0-4.4Zm14 0a2.2 2.2 0 1 0 0 4.4 2.2 2.2 0 0 0 0-4.4Z"/></svg>',
    ship:
      '<svg viewBox="0 0 32 32" aria-hidden="true"><path d="M9 4h14v8h4l-4.6 10.3c-1.6.6-3 .9-4.4.9-1.7 0-3.2-.5-4.7-1-1.4-.5-2.8-.9-4.3-.9-1.2 0-2.5.3-4 .9L1 12h8V4Zm3 8h8V7h-8v5Zm-5.7 3 2 4.3c1.9-.3 3.8.2 5.7.8 2.2.7 4.3 1.4 7.4.1l2.3-5.2H6.3ZM4 26.5c2.2-1.1 4.1-1.3 6-1 1.5.2 2.8.7 4.2 1.1 2.6.8 5.2 1.4 9.8-.8v2.8c-4.4 1.8-7.3 1.3-10 .5-1.6-.5-3-.9-4.6-1-1.4-.1-3 .2-5.4 1.4v-3Z"/></svg>',
  }
  return icons[type] || icons.car
}

function getJourneyRouteCoordinates(journey) {
  const from = [Number(journey.from_lon), Number(journey.from_lat)]
  const to = [Number(journey.to_lon), Number(journey.to_lat)]
  const type = journey.transport_type || 'car'
  const config = transportConfig[type] || transportConfig.car
  const steps = type === 'flight' ? 32 : 22
  const dx = to[0] - from[0]
  const dy = to[1] - from[1]
  const distance = Math.hypot(dx, dy)
  const normal = distance ? [-dy / distance, dx / distance] : [0, 1]
  const lift = Math.max(distance * config.lift, type === 'flight' ? 1.2 : 0)

  return Array.from({ length: steps + 1 }, (_, index) => {
    const t = index / steps
    const ease = Math.sin(Math.PI * t)
    const wave = Math.sin(Math.PI * 2 * t) * distance * (config.wave || 0)
    const arc = lift * ease
    return [
      from[0] + dx * t + normal[0] * wave,
      from[1] + dy * t + normal[1] * wave + arc,
    ]
  })
}

function getPointOnRoute(coords, progress) {
  if (!coords.length) return { point: [0, 0], bearing: 0 }
  if (coords.length === 1) return { point: coords[0], bearing: 0 }

  const segments = coords.slice(1).map((point, index) => {
    const prev = coords[index]
    return Math.hypot(point[0] - prev[0], point[1] - prev[1])
  })
  const total = segments.reduce((sum, value) => sum + value, 0) || 1
  let target = (((progress % 1) + 1) % 1) * total

  for (let index = 0; index < segments.length; index += 1) {
    const length = segments[index]
    if (target <= length || index === segments.length - 1) {
      const from = coords[index]
      const to = coords[index + 1]
      const ratio = length ? target / length : 0
      const point = [
        from[0] + (to[0] - from[0]) * ratio,
        from[1] + (to[1] - from[1]) * ratio,
      ]
      const bearing = Math.atan2(to[1] - from[1], to[0] - from[0]) * 180 / Math.PI
      return { point, bearing }
    }
    target -= length
  }

  return { point: coords[coords.length - 1], bearing: 0 }
}

function colorWithAlpha(color, alpha) {
  if (!color) return `rgba(255, 255, 255, ${alpha})`
  if (color.startsWith('rgba')) return color
  if (color.startsWith('rgb')) return color.replace('rgb(', 'rgba(').replace(')', `, ${alpha})`)
  if (!color.startsWith('#')) return color

  const hex = String(color).slice(1)
  const fullHex = hex.length === 3
    ? hex.split('').map((char) => char + char).join('')
    : hex
  const value = Number.parseInt(fullHex, 16)
  if (Number.isNaN(value)) return color

  const red = (value >> 16) & 255
  const green = (value >> 8) & 255
  const blue = value & 255
  return `rgba(${red}, ${green}, ${blue}, ${alpha})`
}

function hexToRgb(color) {
  if (!color) return [1, 1, 1]
  const rgbMatch = String(color).match(/rgba?\(([^)]+)\)/i)
  if (rgbMatch) {
    const [red = 255, green = 255, blue = 255] = rgbMatch[1]
      .split(',')
      .map((value) => Number.parseFloat(value.trim()))
    return [red / 255, green / 255, blue / 255]
  }
  if (!String(color).startsWith('#')) return [1, 1, 1]
  const hex = color.slice(1)
  const fullHex = hex.length === 3
    ? hex.split('').map((char) => char + char).join('')
    : hex
  const value = Number.parseInt(fullHex, 16)
  if (Number.isNaN(value)) return [1, 1, 1]
  return [
    ((value >> 16) & 255) / 255,
    ((value >> 8) & 255) / 255,
    (value & 255) / 255,
  ]
}

function requestMapResize(delay = 60) {
  if (mapResizeTimer) {
    window.clearTimeout(mapResizeTimer)
  }
  mapResizeTimer = window.setTimeout(() => {
    mapResizeTimer = null
    mapInstance?.resize()
  }, delay)
}

// ========== MapLibre GL 地图函数 ==========

function getGlobalTileSource(skinId = activeMapSkin.value) {
  const tileSets = {
    night: [
      'https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png',
      'https://b.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png',
      'https://c.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png',
    ],
    warm: [
      'https://a.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png',
      'https://b.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png',
      'https://c.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png',
    ],
    vintage: [
      'https://a.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png',
      'https://b.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png',
      'https://c.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png',
    ],
    aero: [
      'https://a.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png',
      'https://b.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png',
      'https://c.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png',
    ],
  }

  return {
    type: 'raster',
    tiles: tileSets[skinId] || tileSets.warm,
    tileSize: 256,
    minzoom: 0,
    maxzoom: 19,
    bounds: [-180, -85.051129, 180, 85.051129],
    attribution: '© OpenStreetMap contributors © CARTO',
  }
}

function getGlobalTileLayerPaint(skinId) {
  return getBaseTileLayerPaint(skinId)
}

function getBaseTileLayerPaint(skinId) {
  // 根据主题调整瓦片显示效果
  switch (skinId) {
    case 'night':
      // 星图主题使用深色全球底图，避免 3D 地球出现刺眼白色半球。
      return {
        'raster-saturation': -0.14,
        'raster-contrast': 0.08,
        'raster-brightness-min': 0.02,
        'raster-brightness-max': 0.86,
        'raster-opacity': 0.96,
      }
    case 'warm':
      // 暖砂主题：傍晚暖色调
      return {
        'raster-saturation': 0.08,
        'raster-contrast': 0.16,
        'raster-brightness-min': 0.08,
        'raster-brightness-max': 0.9,
        'raster-opacity': 0.96,
        'raster-hue-rotate': 12,
      }
    case 'vintage':
      // 复古主题：旧纸质地图效果（叠加棕色滤镜）
      return {
        'raster-saturation': -0.58,
        'raster-contrast': 0.18,
        'raster-brightness-min': 0.16,
        'raster-brightness-max': 0.82,
        'raster-opacity': 0.9,
        'raster-hue-rotate': 32,
      }
    case 'aero':
      // 航线主题：清晰明亮
      return {
        'raster-saturation': -0.12,
        'raster-contrast': 0.12,
        'raster-brightness-min': 0.08,
        'raster-brightness-max': 0.9,
        'raster-opacity': 0.96,
      }
    default:
      return {
        'raster-opacity': 0.8,
      }
  }
}

function getLabelHaloColor(skinId) {
  // 根据主题返回标签光晕颜色
  switch (skinId) {
    case 'night':
      return 'rgba(8, 13, 22, 0.85)' // 深色背景
    case 'warm':
      return 'rgba(255, 248, 236, 0.85)' // 暖色背景
    case 'vintage':
      return 'rgba(244, 234, 210, 0.85)' // 复古浅色背景
    case 'aero':
      return 'rgba(247, 252, 255, 0.85)' // 清爽浅蓝背景
    default:
      return 'rgba(255, 255, 255, 0.78)'
  }
}

function buildMaplibreStyle() {
  const skin = activeMapSkinConfig.value
  const routeColors = skin.routes

  return {
    version: 8,
    name: 'journey-map',
    projection: { type: 'globe' },
    glyphs: 'https://fonts.openmaptiles.org/{fontstack}/{range}.pbf',
    sources: {
      'global-tiles': getGlobalTileSource(activeMapSkin.value),
      'footprints': {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
      },
      'journeys': {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
      },
      'province-boundary': {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
      },
      'district-boundary': {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
      },
      'china-boundary': {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
      },
    },
    layers: [
      // 深色海洋背景（增强层次感）
      {
        id: 'background',
        type: 'background',
        paint: {
          'background-color': skin.sea || '#f5f5f5',
          'background-opacity': 1,
        },
      },
      {
        id: 'global-tile-layer',
        type: 'raster',
        source: 'global-tiles',
        paint: getGlobalTileLayerPaint(activeMapSkin.value),
      },
      // 全国省份边界填充（globe视图下显示）
      {
        id: 'china-fill',
        type: 'fill',
        source: 'china-boundary',
        paint: {
          'fill-color': skin.landAlt || skin.land,
          'fill-opacity': (!currentProvince.value && !currentCityArea.value && activeMapSkin.value !== 'night') ? 0.05 : 0,
        },
      },
      // 全国省份边界线
      {
        id: 'china-line',
        type: 'line',
        source: 'china-boundary',
        paint: {
          'line-color': skin.borderStrong || skin.border,
          'line-width': 1.5,
          'line-opacity': (!currentProvince.value && !currentCityArea.value) ? 0.7 : 0,
        },
      },
      // 全国省份标签
      {
        id: 'china-labels',
        type: 'symbol',
        source: 'china-boundary',
        layout: {
          'text-field': ['get', 'name'],
          'text-font': ['Noto Sans Regular'],
          'text-size': ['interpolate', ['linear'], ['zoom'], 2, 10, 5, 14],
          'text-anchor': 'center',
          'text-max-width': 6,
        },
        paint: {
          'text-color': skin.label,
          'text-halo-color': getLabelHaloColor(activeMapSkin.value),
          'text-halo-width': 2,
          'text-opacity': (!currentProvince.value && !currentCityArea.value) ? 0.85 : 0,
        },
      },
      // 省级边界填充
      {
        id: 'province-fill',
        type: 'fill',
        source: 'province-boundary',
        paint: {
          'fill-color': skin.landAlt || skin.land,
          'fill-opacity': currentProvince.value ? 0.4 : 0,
        },
      },
      // 省级边界线
      {
        id: 'province-line',
        type: 'line',
        source: 'province-boundary',
        paint: {
          'line-color': skin.borderStrong || skin.border,
          'line-width': 2,
          'line-opacity': currentProvince.value ? 0.8 : 0,
        },
      },
      // 区县级边界填充
      {
        id: 'district-fill',
        type: 'fill',
        source: 'district-boundary',
        paint: {
          'fill-color': skin.landAlt || skin.land,
          'fill-opacity': currentCityArea.value ? 0.5 : 0,
        },
      },
      // 区县级边界线
      {
        id: 'district-line',
        type: 'line',
        source: 'district-boundary',
        paint: {
          'line-color': skin.borderStrong || skin.border,
          'line-width': 1.5,
          'line-opacity': currentCityArea.value ? 0.7 : 0,
        },
      },
      // 旅程路线 - 飞机
      {
        id: 'journey-flight',
        type: 'line',
        source: 'journeys',
        filter: ['all', ['==', ['get', 'type'], 'route'], ['==', ['get', 'transport'], 'flight']],
        paint: {
          'line-color': routeColors.flight,
          'line-width': ['interpolate', ['linear'], ['zoom'], 2, 2.4, 8, 4.6],
          'line-opacity': 0.72,
        },
      },
      // 旅程路线 - 火车
      {
        id: 'journey-train',
        type: 'line',
        source: 'journeys',
        filter: ['all', ['==', ['get', 'type'], 'route'], ['==', ['get', 'transport'], 'train']],
        paint: {
          'line-color': routeColors.train,
          'line-width': ['interpolate', ['linear'], ['zoom'], 2, 2.2, 8, 4],
          'line-dasharray': [2, 2],
          'line-opacity': 0.75,
        },
      },
      // 旅程路线 - 汽车
      {
        id: 'journey-car',
        type: 'line',
        source: 'journeys',
        filter: ['all', ['==', ['get', 'type'], 'route'], ['==', ['get', 'transport'], 'car']],
        paint: {
          'line-color': routeColors.car,
          'line-width': ['interpolate', ['linear'], ['zoom'], 2, 2.4, 8, 4.2],
          'line-dasharray': [1, 1.4],
          'line-opacity': 0.7,
        },
      },
      // 旅程路线 - 轮船
      {
        id: 'journey-ship',
        type: 'line',
        source: 'journeys',
        filter: ['all', ['==', ['get', 'type'], 'route'], ['==', ['get', 'transport'], 'ship']],
        paint: {
          'line-color': routeColors.ship,
          'line-width': ['interpolate', ['linear'], ['zoom'], 2, 2.2, 8, 4],
          'line-dasharray': [3, 1.2],
          'line-opacity': 0.75,
        },
      },
      {
        id: 'journey-flow-flight',
        type: 'line',
        source: 'journeys',
        filter: ['all', ['==', ['get', 'type'], 'route'], ['==', ['get', 'transport'], 'flight']],
        paint: {
          'line-color': routeColors.flight,
          'line-width': ['interpolate', ['linear'], ['zoom'], 2, 4, 8, 7],
          'line-opacity': 0.35,
        },
      },
      {
        id: 'journey-flow-train',
        type: 'line',
        source: 'journeys',
        filter: ['all', ['==', ['get', 'type'], 'route'], ['==', ['get', 'transport'], 'train']],
        paint: {
          'line-color': routeColors.train,
          'line-width': ['interpolate', ['linear'], ['zoom'], 2, 3.4, 8, 6],
          'line-opacity': 0.32,
        },
      },
      {
        id: 'journey-flow-car',
        type: 'line',
        source: 'journeys',
        filter: ['all', ['==', ['get', 'type'], 'route'], ['==', ['get', 'transport'], 'car']],
        paint: {
          'line-color': routeColors.car,
          'line-width': ['interpolate', ['linear'], ['zoom'], 2, 3.6, 8, 6],
          'line-opacity': 0.32,
        },
      },
      {
        id: 'journey-flow-ship',
        type: 'line',
        source: 'journeys',
        filter: ['all', ['==', ['get', 'type'], 'route'], ['==', ['get', 'transport'], 'ship']],
        paint: {
          'line-color': routeColors.ship,
          'line-width': ['interpolate', ['linear'], ['zoom'], 2, 3.4, 8, 6],
          'line-opacity': 0.32,
        },
      },
      // 足迹标记点
      {
        id: 'footprint-halos',
        type: 'circle',
        source: 'footprints',
        filter: ['==', ['get', 'type'], 'point'],
        paint: {
          'circle-radius': ['interpolate', ['linear'], ['zoom'], 2, 10, 7, 20, 13, 34],
          'circle-color': skin.pointHalo || skin.glow,
          'circle-blur': activeMapSkin.value === 'night' ? 0.42 : 0.35,
          'circle-opacity': ['interpolate', ['linear'], ['zoom'], 2, 0.48, 8, 0.26, 14, 0.18],
        },
      },
      {
        id: 'footprint-points',
        type: 'circle',
        source: 'footprints',
        filter: ['==', ['get', 'type'], 'point'],
        paint: {
          'circle-radius': ['interpolate', ['linear'], ['zoom'], 2, 6, 7, 12, 13, 18],
          'circle-color': skin.point,
          'circle-stroke-color': activeMapSkin.value === 'night' ? 'rgba(255, 191, 95, 0.6)' : 'rgba(255, 255, 255, 0.92)',
          'circle-stroke-width': ['interpolate', ['linear'], ['zoom'], 2, 2, 9, 3],
          'circle-opacity': 0.92,
          'circle-blur': 0.1, // 添加轻微模糊增强发光效果
        },
      },
      // 足迹发光层（增强真实感）
      {
        id: 'footprint-glow',
        type: 'circle',
        source: 'footprints',
        filter: ['==', ['get', 'type'], 'point'],
        paint: {
          'circle-radius': ['interpolate', ['linear'], ['zoom'], 2, 9, 7, 18, 13, 26],
          'circle-color': skin.pointHalo || 'rgba(201, 79, 53, 0.2)',
          'circle-opacity': 0.25,
        },
      },
      // 足迹标签
      {
        id: 'footprint-labels',
        type: 'symbol',
        source: 'footprints',
        filter: ['==', ['get', 'type'], 'point'],
        layout: {
          'text-field': ['get', 'name'],
          'text-font': ['Noto Sans Regular'],
          'text-size': 12,
          'text-anchor': 'top',
          'text-offset': [0, 1],
          'text-max-width': 8,
        },
        paint: {
          'text-color': skin.label,
          'text-halo-color': getLabelHaloColor(activeMapSkin.value),
          'text-halo-width': 2,
        },
      },
    ],
  }
}

function buildFootprintGeoJSON() {
  const features = []

  // 添加足迹点
  footprintGroups.value.forEach((group) => {
    if (!group.longitude || !group.latitude) return
    features.push({
      type: 'Feature',
      geometry: {
        type: 'Point',
        coordinates: [group.longitude, group.latitude],
      },
      properties: {
        type: 'point',
        name: group.label,
        id: group.records[0]?.id,
        records: JSON.stringify(group.records),
        count: group.records.length,
      },
    })
  })

  return { type: 'FeatureCollection', features }
}

function buildJourneyGeoJSON() {
  const features = []

  ;(placesStore.journeys || []).forEach((journey) => {
    if (!journey.from_lon || !journey.from_lat || !journey.to_lon || !journey.to_lat) return

    const coordinates = getJourneyRouteCoordinates(journey)

    features.push({
      type: 'Feature',
      geometry: {
        type: 'LineString',
        coordinates,
      },
      properties: {
        type: 'route',
        transport: journey.transport_type,
        id: journey.id,
        from_city: journey.from_city_name,
        to_city: journey.to_city_name,
      },
    })
  })

  return { type: 'FeatureCollection', features }
}

function buildJourneyVehicleMarker(journey) {
  const skin = activeMapSkinConfig.value
  const type = journey.transport_type || 'car'
  const color = skin.routes?.[type] || transportConfig[type]?.color || skin.point
  const el = document.createElement('div')
  el.className = `journey-vehicle-marker journey-vehicle-${type}`
  el.style.setProperty('--vehicle-color', color)
  el.style.setProperty('--vehicle-halo', colorWithAlpha(color, 0.28))
  el.style.setProperty('--vehicle-glass', activeMapSkin.value === 'night' ? 'rgba(9, 14, 24, 0.78)' : 'rgba(255, 255, 255, 0.84)')
  el.innerHTML = `
    <span class="journey-vehicle-trail"></span>
    <span class="journey-vehicle-glyph">${getTransportIconSvg(type)}</span>
  `
  el.addEventListener('click', () => {
    selectedJourney.value = journey
    showJourneyDetail.value = true
  })
  return el
}

function updateJourneyVehicleMarkers() {
  if (!mapInstance || !maplibreGlModule) return

  const activeIds = new Set()
  const frameBase = journeyAnimationFrame / 120
  ;(placesStore.journeys || []).forEach((journey, index) => {
    if (!journey.from_lon || !journey.from_lat || !journey.to_lon || !journey.to_lat) return

    const id = String(journey.id)
    const type = journey.transport_type || 'car'
    const config = transportConfig[type] || transportConfig.car
    const offset = ((Number(journey.id) || index + 1) % 17) / 17
    const progress = (frameBase * (config.speed * 120) + offset) % 1
    const route = getJourneyRouteCoordinates(journey)
    const { point, bearing } = getPointOnRoute(route, progress)
    const color = activeMapSkinConfig.value.routes?.[type] || config.color

    let marker = journeyVehicleMarkers.get(id)
    if (!marker) {
      marker = new maplibreGlModule.Marker({
        element: buildJourneyVehicleMarker(journey),
        anchor: 'center',
      })
        .setLngLat(point)
        .addTo(mapInstance)
      journeyVehicleMarkers.set(id, marker)
    }

    const el = marker.getElement()
    el.style.setProperty('--vehicle-color', color)
    el.style.setProperty('--vehicle-halo', colorWithAlpha(color, 0.28))
    el.style.setProperty('--vehicle-rotate', `${bearing + (type === 'flight' ? -38 : 0)}deg`)
    el.classList.remove('journey-vehicle-flight', 'journey-vehicle-train', 'journey-vehicle-car', 'journey-vehicle-ship')
    el.classList.add(`journey-vehicle-${type}`)
    marker.setLngLat(point)
    activeIds.add(id)
  })

  journeyVehicleMarkers.forEach((marker, id) => {
    if (!activeIds.has(id)) {
      marker.remove()
      journeyVehicleMarkers.delete(id)
    }
  })
}

function clearJourneyVehicleMarkers() {
  journeyVehicleMarkers.forEach(marker => marker.remove())
  journeyVehicleMarkers = new Map()
}

function updateFootprintMarkers() {
  if (!mapInstance) return

  const footprintSource = mapInstance.getSource('footprints')
  if (footprintSource) {
    footprintSource.setData(buildFootprintGeoJSON())
  }

  const journeySource = mapInstance.getSource('journeys')
  if (journeySource) {
    journeySource.setData(buildJourneyGeoJSON())
  }
  updateJourneyVehicleMarkers()
}

function updateProvinceBoundaryLayer(geojson) {
  if (!mapInstance) return

  const source = mapInstance.getSource('province-boundary')
  if (source) {
    source.setData(geojson)
  }
}

function updateDistrictBoundaryLayer(geojson) {
  if (!mapInstance) return

  const source = mapInstance.getSource('district-boundary')
  if (source) {
    source.setData(geojson)
  }
}

function removeBoundaryLayers() {
  if (!mapInstance) return

  clearProvinceLabelMarkers()

  const provinceSource = mapInstance.getSource('province-boundary')
  if (provinceSource) {
    provinceSource.setData({ type: 'FeatureCollection', features: [] })
  }

  const districtSource = mapInstance.getSource('district-boundary')
  if (districtSource) {
    districtSource.setData({ type: 'FeatureCollection', features: [] })
  }
}

function removeDistrictBoundaryLayer() {
  if (!mapInstance) return

  const source = mapInstance.getSource('district-boundary')
  if (source) {
    source.setData({ type: 'FeatureCollection', features: [] })
  }
}

function updateChinaBoundaryLayer(geojson) {
  if (!mapInstance) return

  const source = mapInstance.getSource('china-boundary')
  if (source && geojson) {
    // 为每个省份添加 name 属性
    const enhancedGeojson = {
      type: 'FeatureCollection',
      features: geojson.features.map(f => ({
        ...f,
        properties: {
          ...f.properties,
          name: normalizeRegionName(f.properties?.name || ''),
        },
      })),
    }
    source.setData(enhancedGeojson)
  }
}

function getFeatureCenter(feature) {
  // 计算 GeoJSON feature 的中心点
  const geometry = feature.geometry
  if (!geometry) return null

  const coords = geometry.coordinates
  if (!coords || coords.length === 0) return null

  let sumLon = 0, sumLat = 0, count = 0

  function processCoords(c) {
    if (typeof c[0] === 'number') {
      sumLon += c[0]
      sumLat += c[1]
      count++
    } else {
      c.forEach(processCoords)
    }
  }

  processCoords(coords)
  if (count === 0) return null
  return [sumLon / count, sumLat / count]
}

function clearProvinceLabelMarkers() {
  provinceLabelMarkers.forEach(m => m.remove())
  provinceLabelMarkers = []
}

// 加载完整的中国边界数据（582KB，按需加载）
async function loadFullChinaBoundary() {
  if (chinaBoundaryLoaded.value) return

  try {
    const response = await fetch('/china_full.json')
    if (response.ok) {
      const chinaGeoJson = await response.json()
      chinaGeoCache.value = chinaGeoJson
      chinaBoundaryLoaded.value = true

      // 更新边界图层
      updateChinaBoundaryLayer(chinaGeoJson)
    }
  } catch (err) {
    console.warn('加载完整边界数据失败:', err)
  }
}

function updateMapView() {
  if (!mapInstance) return
  markMapTextureLoading()

  // 清除旧的 DOM 标注，省份名称不再使用浮层小卡片显示。
  clearProvinceLabelMarkers()
  clearJourneyVehicleMarkers()

  mapInstance.setStyle(buildMaplibreStyle())

  const restoreMapLayers = () => {
    // 重新设置边界数据
    if (chinaGeoCache.value) {
      updateChinaBoundaryLayer(chinaGeoCache.value)
    }
    if (currentProvince.value && provinceGeoCache.value[currentProvince.value.adcode]) {
      updateProvinceBoundaryLayer(provinceGeoCache.value[currentProvince.value.adcode])
    }
    if (currentCityArea.value && districtGeoCache.value[currentCityArea.value.adcode]) {
      updateDistrictBoundaryLayer(districtGeoCache.value[currentCityArea.value.adcode])
    }

    updateFootprintMarkers()
    startJourneyAnimation()
    markMapTextureReady(320)
  }

  mapInstance.once('style.load', restoreMapLayers)
  mapInstance.once('idle', () => markMapTextureReady(120))
}

function startAutoRotate() {
  if (!mapInstance || globeRotateTimer) return
  globeRotateTimer = window.setInterval(() => {
    if (!globeAutoRotate || !mapInstance) return
    if (mapInstance.getZoom() > 4.2) return
    const center = mapInstance.getCenter()
    mapInstance.setCenter([center.lng + 0.08, center.lat])
  }, 50)
}

function stopAutoRotate() {
  if (globeRotateTimer) {
    window.clearInterval(globeRotateTimer)
    globeRotateTimer = null
  }
}

function buildJourneyFlowGradient(color, progress) {
  const phase = Math.floor(progress * 6) % 6
  const patterns = [
    [0.2, 2.8, 1.8, 2.2],
    [0.6, 2.4, 1.8, 2.2],
    [1, 2, 1.8, 2.2],
    [1.4, 1.6, 1.8, 2.2],
    [1.8, 1.2, 1.8, 2.2],
    [2.2, 0.8, 1.8, 2.2],
  ]
  return patterns[phase]
}

function updateJourneyAnimationFrame() {
  if (!mapInstance) return
  const routeColors = activeMapSkinConfig.value.routes
  const progress = 0.15 + ((journeyAnimationFrame % 70) / 100)
  const flowLayers = [
    ['journey-flow-flight', routeColors.flight],
    ['journey-flow-train', routeColors.train],
    ['journey-flow-car', routeColors.car],
    ['journey-flow-ship', routeColors.ship],
  ]

  flowLayers.forEach(([layerId, color]) => {
    if (mapInstance.getLayer(layerId)) {
      mapInstance.setPaintProperty(layerId, 'line-color', colorWithAlpha(color, 0.9))
      mapInstance.setPaintProperty(layerId, 'line-dasharray', buildJourneyFlowGradient(color, progress))
      mapInstance.setPaintProperty(layerId, 'line-opacity', 0.24 + Math.sin(progress * Math.PI * 2) * 0.08)
    }
  })
  updateJourneyVehicleMarkers()
  journeyAnimationFrame += 2
}

function startJourneyAnimation() {
  if (journeyAnimationTimer) return
  updateJourneyAnimationFrame()
  journeyAnimationTimer = window.setInterval(updateJourneyAnimationFrame, 90)
}

function stopJourneyAnimation() {
  if (journeyAnimationTimer) {
    window.clearInterval(journeyAnimationTimer)
    journeyAnimationTimer = null
  }
  clearJourneyVehicleMarkers()
}

async function initMap() {
  if (!mapRef.value) return
  markMapTextureLoading()

  const maplibreGl = await loadMapLibreGL()
  maplibreGlModule = maplibreGl // 存储模块供后续使用

  mapInstance = new maplibreGl.Map({
    container: mapRef.value,
    style: buildMaplibreStyle(),
    center: DEFAULT_GLOBE_CENTER,
    zoom: getDefaultMapZoom(),
    maxZoom: 18,
    minZoom: 0.7,
    projection: 'globe',
    attributionControl: false,
    scrollZoom: true,
    pixelRatio: Math.min(window.devicePixelRatio, 1.5), // 限制像素比，减少渲染开销
    crossSourceCollisions: false, // 禁用跨源碰撞检测
  })
  mapInstance.scrollZoom.enable()
  mapInstance.touchZoomRotate.enable()
  mapInstance.doubleClickZoom.enable()
  mapInstance.dragPan.enable()
  syncMapZoomLevel()

  // 地图加载完成后的初始化
  mapInstance.on('load', async () => {
    // 立即加载中国边界数据，让用户能看到省份轮廓
    await loadFullChinaBoundary()

    updateFootprintMarkers()
    markMapTextureReady(450)

    // 开始自动旋转（globe 模式）
    startAutoRotate()
    startJourneyAnimation()

    // 设置鼠标交互时停止自动旋转
    mapInstance.on('mousedown', () => {
      globeAutoRotate = false
    })

    mapInstance.on('touchstart', () => {
      globeAutoRotate = false
    })
  })

  // 点击足迹点
  mapInstance.on('click', 'footprint-points', (e) => {
    const properties = e.features[0]?.properties
    if (!properties) return

    globeAutoRotate = false

    if (properties.count > 1) {
      const records = JSON.parse(properties.records || '[]')
      openCluster(records, properties.name)
    } else {
      selectFootprint(Number(properties.id))
    }
  })

  // 地图点击事件（处理选点模式）
  mapInstance.on('click', (e) => {
    handleMapClickForLocation(e)
  })

  // 点击全国省份边界区域（globe视图，需要完整边界数据）
  mapInstance.on('click', 'china-fill', async (e) => {
    if (!currentProvince.value && !currentCityArea.value) {
      // 从全国视图点击进入省份
      const provinceName = e.features[0]?.properties?.name || ''
      const province = getProvinceByName(provinceName)
      if (province) {
        globeAutoRotate = false
        await loadProvinceMap(province)
      }
    }
  })

  // 鼠标悬停在省份上显示指针
  mapInstance.on('mouseenter', 'china-fill', () => {
    if (!currentProvince.value && !currentCityArea.value) {
      mapInstance.getCanvas().style.cursor = 'pointer'
    }
  })

  mapInstance.on('mouseleave', 'china-fill', () => {
    mapInstance.getCanvas().style.cursor = 'grab'
  })

  // 点击省份边界区域（省份视图进入区县）
  mapInstance.on('click', 'province-fill', async (e) => {
    if (currentProvince.value && !currentCityArea.value) {
      // 从省份视图点击进入区县，点击的feature就是区县
      const feature = e.features[0]
      if (feature) {
        await loadDistrictMap(feature)
      }
    }
  })

  // 区县级边界悬停效果
  mapInstance.on('mouseenter', 'district-fill', () => {
    if (currentCityArea.value) {
      mapInstance.getCanvas().style.cursor = 'pointer'
    }
  })

  // 鼠标悬停效果
  mapInstance.on('mouseenter', 'footprint-points', () => {
    mapInstance.getCanvas().style.cursor = 'pointer'
  })

  mapInstance.on('mouseleave', 'footprint-points', () => {
    mapInstance.getCanvas().style.cursor = 'grab'
  })

  // 省级边界悬停效果
  mapInstance.on('mouseenter', 'province-fill', () => {
    if (currentProvince.value && !currentCityArea.value) {
      mapInstance.getCanvas().style.cursor = 'pointer'
    }
  })

  mapInstance.on('mouseleave', 'province-fill', () => {
    mapInstance.getCanvas().style.cursor = 'grab'
  })

  // 监听缩放变化，切换 globe/mercator 投影
  mapInstance.on('zoom', () => {
    syncMapZoomLevel()
    const zoom = mapInstance.getZoom()
    if (zoom > 5 && mapInstance.getProjection().type === 'globe') {
      // 放大到一定程度时可以考虑切换到 mercator（可选）
    }
  })

  mapInstance.on('moveend', syncMapZoomLevel)

  // Resize 监听
  mapResizeObserver?.disconnect()
  mapResizeObserver = new ResizeObserver(() => requestMapResize(80))
  mapResizeObserver.observe(mapRef.value)

  window.addEventListener('resize', mobileResizeHandler)
}

// ========== 旅程相关函数 ==========

const journeyTypeOptions = [
  { id: 'flight', icon: '✈️', label: '飞机' },
  { id: 'train', icon: '🚄', label: '火车' },
  { id: 'car', icon: '🚗', label: '汽车' },
  { id: 'ship', icon: '🚢', label: '轮船' },
]

function getJourneyIcon(type) {
  const option = journeyTypeOptions.find(t => t.id === type)
  return option?.icon || '🚶'
}

function getJourneyTypeLabel(type) {
  const option = journeyTypeOptions.find(t => t.id === type)
  return option?.label || '其他'
}

function getCityNameById(id) {
  const city = placesStore.cities.find(c => c.id === id)
  if (!city) return '未知'
  return city.district_name ? `${city.name} · ${city.district_name}` : city.name
}

function formatJourneyDate(dateStr) {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  if (isNaN(date.getTime())) return ''
  return `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, '0')}.${String(date.getDate()).padStart(2, '0')}`
}

function formatJourneyTime(dateStr) {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  if (isNaN(date.getTime())) return ''
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
}

function formatDuration(minutes) {
  if (!minutes) return ''
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  if (hours > 0 && mins > 0) return `${hours}小时${mins}分钟`
  if (hours > 0) return `${hours}小时`
  return `${mins}分钟`
}

const filteredJourneys = computed(() => {
  let journeys = (placesStore.journeys || []).slice()
  if (journeyFilter.value !== 'all') {
    journeys = journeys.filter(j => j.transport_type === journeyFilter.value)
  }
  return journeys.sort((a, b) => new Date(b.departure_time || 0) - new Date(a.departure_time || 0))
})

const canSubmitJourney = computed(() => {
  return journeyFormData.value.from_city_id &&
         journeyFormData.value.to_city_id &&
         journeyFormData.value.from_city_id !== journeyFormData.value.to_city_id &&
         journeyFormData.value.transport_type
})

function openAddJourney() {
  editingJourney.value = null
  journeyFormData.value = {
    from_city_id: null,
    to_city_id: null,
    transport_type: 'flight',
    transport_name: '',
    departure_time: '',
    arrival_time: '',
    notes: '',
  }
  showAddJourneyPanel.value = true
}

function closeAddJourneyPanel() {
  showAddJourneyPanel.value = false
  editingJourney.value = null
}

async function submitJourney() {
  if (!canSubmitJourney.value) return
  isLoading.value = true
  loadingText.value = '保存旅程中...'

  try {
    const isEditing = Boolean(editingJourney.value?.id)
    const payload = {
      from_city_id: journeyFormData.value.from_city_id,
      to_city_id: journeyFormData.value.to_city_id,
      transport_type: journeyFormData.value.transport_type,
      transport_name: journeyFormData.value.transport_name,
      departure_time: journeyFormData.value.departure_time || null,
      arrival_time: journeyFormData.value.arrival_time || null,
      notes: journeyFormData.value.notes,
    }

    if (isEditing) {
      await placesStore.updateJourney(editingJourney.value.id, payload)
    } else {
      await placesStore.addJourney(payload)
    }
    closeAddJourneyPanel()
    updateMapView()
    showToast(isEditing ? '旅程已更新' : '旅程已保存', 'success')
  } catch (error) {
    showToast('旅程保存失败，请重试', 'error')
  } finally {
    isLoading.value = false
  }
}

function selectJourneyOnMap(journey) {
  selectedJourney.value = journey
  showJourneyDetail.value = true
  if (isMobile.value) {
    mobileView.value = 'map'
  }

  // 在地图上高亮这条路线 - 移动视角到路线中间
  if (mapInstance && journey.from_lon && journey.to_lon && journey.from_lat && journey.to_lat) {
    globeAutoRotate = false
    const centerLon = (Number(journey.from_lon) + Number(journey.to_lon)) / 2
    const centerLat = (Number(journey.from_lat) + Number(journey.to_lat)) / 2
    mapInstance.flyTo({
      center: [centerLon, centerLat],
      zoom: 6,
      duration: 1200,
    })
  }
}

function closeJourneyDetail() {
  showJourneyDetail.value = false
  selectedJourney.value = null
}

function editJourney(journey) {
  editingJourney.value = journey
  journeyFormData.value = {
    from_city_id: journey.from_city_id,
    to_city_id: journey.to_city_id,
    transport_type: journey.transport_type,
    transport_name: journey.transport_name || '',
    departure_time: journey.departure_time || '',
    arrival_time: journey.arrival_time || '',
    notes: journey.notes || '',
  }
  showJourneyDetail.value = false
  showAddJourneyPanel.value = true
}

async function confirmDeleteJourney(id) {
  if (!window.confirm('确定删除这条旅程吗？')) return
  isLoading.value = true
  loadingText.value = '删除旅程中...'

  try {
    await placesStore.deleteJourney(id)
    closeJourneyDetail()
    updateMapView()
    showToast('旅程已删除', 'success')
  } catch (error) {
    showToast('旅程删除失败，请重试', 'error')
  } finally {
    isLoading.value = false
  }
}

onMounted(async () => {
  editMode.checkEditMode()
  updateTopbarCondensed()
  window.addEventListener('scroll', handleWindowScroll, { passive: true })
  isLoading.value = true
  loadingText.value = '初始化页面...'

  try {
    await placesStore.fetchPlaces().catch(() => {
      placesStore.provinces = []
      placesStore.cities = []
      showSystemNotice('足迹数据暂时加载失败，地图框架仍可预览。', 'error')
    })
    await placesStore.fetchJourneys().catch(() => {
      placesStore.journeys = []
      showSystemNotice('旅程数据暂时加载失败，地图足迹仍可正常浏览。', 'error')
    })
    await nextTick()
    await initMap()
  } finally {
    isLoading.value = false
  }
})

onUnmounted(() => {
  window.removeEventListener('resize', mobileResizeHandler)
  window.removeEventListener('scroll', handleWindowScroll)
  mapResizeObserver?.disconnect()
  if (mapResizeTimer) {
    window.clearTimeout(mapResizeTimer)
  }
  clearMapTextureTimers()
  stopAutoRotate()
  stopJourneyAnimation()
  clearProvinceLabelMarkers()
  mapInstance?.remove()
  mapInstance = null
  maplibreGlModule = null
  clearPendingPhotos()
})

watch(viewMode, () => {
  requestMapResize(120)
})

watch(mobileView, () => {
  requestMapResize(120)
})

watch(
  () => editMode.showPasswordModal,
  (shouldShow) => {
    if (shouldShow && !editMode.isAuthenticated) {
      openPasswordModal()
    }
  },
)

watch(filteredCities, () => {
  updateMapView()
  updateFootprintMarkers()
  if (selectedFootprint.value && !filteredCities.value.find((city) => city.id === selectedFootprint.value.id)) {
    closeFootprintPanel()
  }
  if (selectedCluster.value) {
    const visibleIds = new Set(filteredCities.value.map((city) => city.id))
    selectedCluster.value.records = selectedCluster.value.records.filter((record) => visibleIds.has(record.id))
    if (selectedCluster.value.records.length === 0) {
      selectedCluster.value = null
    }
  }
}, { deep: true })

watch(
  () => placesStore.journeys,
  () => updateFootprintMarkers(),
  { deep: true },
)

watch(
  () => formData.value.city_name,
  (cityName) => {
    if (suppressLocationSync) return
    if (!cityName || currentCityArea.value) return
    const city = availableCities.value.find((item) => item.value === cityName)
    if (!city) return
    formData.value.city_adcode = city.adcode || ''
    formData.value.latitude = city.center?.[1] ?? null
    formData.value.longitude = city.center?.[0] ?? null
  },
)

watch(
  () => formData.value.district_name,
  (districtName) => {
    if (suppressLocationSync) return
    if (!districtName || !currentCityArea.value) return
    const district = availableDistricts.value.find((item) => item.value === districtName)
    if (!district) return
    formData.value.district_adcode = district.adcode || ''
    formData.value.latitude = district.center?.[1] ?? null
    formData.value.longitude = district.center?.[0] ?? null
  },
)
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@500;600;700&family=Noto+Serif+SC:wght@400;500;600;700&display=swap');

:global(body) {
  margin: 0;
  font-family: 'Microsoft YaHei', 'PingFang SC', 'Hiragino Sans GB', 'Noto Sans CJK SC', 'Noto Serif SC', sans-serif;
  background: #f6ecdf;
  color: #241a13;
}

:global(button),
:global(input),
:global(textarea),
:global(select) {
  font-family: 'Microsoft YaHei', 'PingFang SC', 'Hiragino Sans GB', 'Noto Sans CJK SC', 'Noto Serif SC', sans-serif;
}

:global(html) {
  scroll-behavior: smooth;
  scrollbar-width: thin;
  scrollbar-color: rgba(139, 115, 85, 0.24) rgba(255, 252, 247, 0.45);
}

:global(*) {
  box-sizing: border-box;
}

:global(::selection) {
  background: rgba(187, 77, 51, 0.18);
  color: #241a13;
}

:global(::-webkit-scrollbar) {
  width: 8px;
  height: 8px;
}

:global(::-webkit-scrollbar-track) {
  background: rgba(255, 252, 247, 0.45);
}

:global(::-webkit-scrollbar-thumb) {
  border: 2px solid rgba(255, 252, 247, 0.45);
  border-radius: 999px;
  background: rgba(139, 115, 85, 0.28);
}

.app-shell {
  position: relative;
  width: 100%;
  min-height: 100vh;
  min-height: 100dvh;
  padding: 24px;
  overflow-x: hidden;
  overflow-y: auto;
  background: var(--page-background);
  color: var(--text-main);
  transition: background 0.35s ease, color 0.35s ease;
}

.app-shell.immersive-space {
  background:
    radial-gradient(circle at 50% 34%, rgba(82, 130, 235, 0.28), transparent 28%),
    radial-gradient(circle at 14% 18%, rgba(255, 183, 92, 0.12), transparent 24%),
    linear-gradient(140deg, #050814 0%, #0a1020 46%, #17101a 100%);
  color: rgba(255, 244, 224, 0.92);
}

.app-shell.immersive-space .topbar,
.app-shell.immersive-space .sidebar,
.app-shell.immersive-space .detail-panel,
.app-shell.immersive-space .modal-card,
.app-shell.immersive-space .theme-panel,
.app-shell.immersive-space .auth-panel,
.app-shell.immersive-space .empty-guide-card {
  background:
    linear-gradient(135deg, rgba(255, 255, 255, 0.12), rgba(255, 255, 255, 0.045)),
    rgba(8, 13, 24, 0.58);
  border-color: rgba(255, 244, 224, 0.16);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.16),
    0 24px 70px rgba(0, 0, 0, 0.36);
  color: rgba(255, 244, 224, 0.92);
}

.app-shell.immersive-space .panel-soft,
.app-shell.immersive-space .panel-strong {
  background:
    linear-gradient(135deg, rgba(255, 255, 255, 0.11), rgba(255, 255, 255, 0.035)),
    rgba(8, 13, 24, 0.5);
  border-color: rgba(255, 244, 224, 0.14);
}

.app-shell.immersive-space .brand-block p,
.app-shell.immersive-space .stage-subcopy,
.app-shell.immersive-space .detail-copy p,
.app-shell.immersive-space .detail-header p,
.app-shell.immersive-space .detail-empty p,
.app-shell.immersive-space .timeline-item p,
.app-shell.immersive-space .memory-item p,
.app-shell.immersive-space .modal-header p,
.app-shell.immersive-space .helper-card p,
.app-shell.immersive-space .stat-card small,
.app-shell.immersive-space .notice-copy {
  color: rgba(255, 244, 224, 0.68);
}

.app-shell.immersive-space .ghost-btn,
.app-shell.immersive-space .zoom-chip,
.app-shell.immersive-space .breadcrumb-chip,
.app-shell.immersive-space .search-input,
.app-shell.immersive-space .year-select,
.app-shell.immersive-space .field-control,
.app-shell.immersive-space .coord-picker,
.app-shell.immersive-space .helper-card,
.app-shell.immersive-space .timeline-item,
.app-shell.immersive-space .memory-list-card,
.app-shell.immersive-space .filter-card,
.app-shell.immersive-space .stat-card,
.app-shell.immersive-space .narrative-card,
.app-shell.immersive-space .region-card {
  background: rgba(255, 255, 255, 0.09);
  border-color: rgba(255, 244, 224, 0.13);
  color: rgba(255, 244, 224, 0.9);
}

.app-shell.immersive-space .memory-item,
.app-shell.immersive-space .detail-empty-note,
.app-shell.immersive-space .empty-line {
  background: rgba(255, 255, 255, 0.12);
  color: rgba(255, 244, 224, 0.82);
}

.app-shell.immersive-space .memory-item p,
.app-shell.immersive-space .memory-list-card p,
.app-shell.immersive-space .detail-empty-note {
  color: rgba(255, 244, 224, 0.76);
}

.ambient-layer {
  position: fixed;
  inset: 0;
  z-index: 0;
  pointer-events: none;
}

.gradient-orb {
  position: absolute;
  border-radius: 50%;
  filter: blur(110px);
  opacity: 0.4;
  animation: float 14s ease-in-out infinite;
}

.orb-1 {
  width: 36rem;
  height: 36rem;
  top: -8rem;
  left: -7rem;
  background: var(--orb-one);
}

.orb-2 {
  width: 28rem;
  height: 28rem;
  right: -5rem;
  top: 10rem;
  background: var(--orb-two);
  animation-delay: -5s;
}

.orb-3 {
  width: 24rem;
  height: 24rem;
  left: 26%;
  bottom: -5rem;
  background: var(--orb-three);
  animation-delay: -9s;
}

.light-rays,
.noise-overlay {
  position: absolute;
  inset: 0;
}

.light-rays {
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.16), transparent 35%);
  mix-blend-mode: soft-light;
}

.noise-overlay {
  opacity: 0.04;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 200 200'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
}

.panel {
  position: relative;
  z-index: 1;
  border: 1px solid var(--panel-border);
  backdrop-filter: blur(18px);
  -webkit-backdrop-filter: blur(18px);
  transition: background 0.32s ease, border-color 0.32s ease, box-shadow 0.32s ease, color 0.32s ease;
}

.panel-soft {
  background: var(--panel-soft-bg);
}

.panel-strong {
  background: var(--panel-strong-bg);
  box-shadow: 0 18px 60px color-mix(in srgb, var(--dark) 18%, transparent);
}

.topbar {
  position: sticky;
  top: 14px;
  z-index: 20;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
  padding: 12px 18px;
  border-radius: 28px;
  margin-bottom: 8px;
  transform-origin: top center;
  transition:
    padding 0.24s ease,
    border-radius 0.24s ease,
    box-shadow 0.24s ease,
    transform 0.24s ease,
    background 0.24s ease;
}

.topbar.condensed {
  padding: 10px 16px;
  border-radius: 999px;
  box-shadow: 0 16px 46px color-mix(in srgb, var(--dark) 18%, transparent);
}

.topbar.condensed .brand-block {
  min-width: 0;
}

.topbar.condensed .eyebrow,
.topbar.condensed .brand-block p,
.topbar.condensed .breadcrumb-bar {
  display: none;
}

.topbar.condensed .brand-block h1 {
  max-width: min(42vw, 520px);
  overflow: hidden;
  font-size: clamp(1.15rem, 1.8vw, 1.45rem);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.topbar.condensed .brand-line {
  align-items: center;
}

.topbar.condensed .topbar-actions {
  gap: 8px;
  flex-wrap: nowrap;
}

.topbar.condensed .ghost-btn,
.topbar.condensed .primary-btn {
  padding: 8px 12px;
  font-size: 0.86rem;
}

.brand-block h1,
.narrative-card h2,
.map-stage-header h2,
.detail-header h2,
.detail-empty h2,
.section-heading h3,
.modal-header h3 {
  margin: 0;
  font-family: 'Noto Serif SC', 'Songti SC', 'Microsoft YaHei', serif;
  font-weight: 600;
}

.brand-block h1 {
  font-size: clamp(1.65rem, 2.35vw, 2.45rem);
}

.brand-block p,
.narrative-card p,
.map-overlay-card p,
.detail-copy p,
.detail-header p,
.detail-empty p,
.timeline-item p,
.memory-item p,
.modal-header p,
.helper-card p,
.upload-box p {
  margin: 0;
  color: var(--text-muted);
  line-height: 1.7;
}

.breadcrumb-bar {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 8px;
}

.breadcrumb-chip {
  border: 1px solid var(--panel-border);
  border-radius: 999px;
  background: var(--button-bg);
  padding: 6px 11px;
  cursor: pointer;
  color: var(--button-text);
  transition: all 0.2s ease;
}

.breadcrumb-chip.active {
  background: var(--accent-soft);
  border-color: color-mix(in srgb, var(--accent) 38%, transparent);
  color: var(--accent);
}

.eyebrow {
  display: inline-flex;
  margin-bottom: 10px;
  color: color-mix(in srgb, var(--primary) 88%, var(--accent));
  text-transform: uppercase;
  letter-spacing: 0.22em;
  font-size: 0.76rem;
}

.brand-line {
  display: flex;
  align-items: center;
  gap: 12px;
}

.status-pill {
  padding: 6px 10px;
  border-radius: 999px;
  background: var(--button-bg);
  color: var(--accent);
  font-size: 0.78rem;
}

.topbar-actions,
.map-stage-actions,
.modal-actions,
.detail-actions {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.topbar-actions,
.map-stage-actions {
  justify-content: flex-end;
}

.stage-mode-group,
.map-zoom-cluster {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 5px;
  border-radius: 999px;
  background: color-mix(in srgb, var(--button-bg) 72%, transparent);
  border: 1px solid color-mix(in srgb, var(--panel-border) 70%, transparent);
}

.map-zoom-cluster {
  box-shadow: inset 0 0 0 1px color-mix(in srgb, white 18%, transparent);
}

.zoom-chip {
  min-width: 38px;
  height: 38px;
  border: none;
  border-radius: 999px;
  background: transparent;
  color: var(--button-text);
  cursor: pointer;
  font: inherit;
  font-weight: 700;
  transition: background 0.2s ease, color 0.2s ease, transform 0.2s ease;
}

.zoom-chip.reset {
  min-width: 56px;
  padding: 0 12px;
  font-size: 0.86rem;
  font-weight: 500;
}

.zoom-chip:hover,
.zoom-chip:focus-visible {
  background: var(--accent-soft);
  color: var(--accent);
  transform: translateY(-1px);
}

.ghost-btn,
.primary-btn,
.danger-btn,
.chip,
.theme-card,
.timeline-item,
.memory-item {
  font: inherit;
}

.ghost-btn,
.primary-btn,
.danger-btn {
  border: none;
  border-radius: 999px;
  padding: 12px 18px;
  cursor: pointer;
  transition: transform 0.25s ease, box-shadow 0.25s ease, opacity 0.25s ease;
}

.ghost-btn {
  background: var(--button-bg);
  color: var(--button-text);
  box-shadow: 0 8px 24px color-mix(in srgb, var(--dark) 10%, transparent);
}

.ghost-btn:hover,
.primary-btn:hover,
.danger-btn:hover,
.chip:hover,
.theme-card:hover,
.timeline-item:hover,
.memory-item:hover,
.quick-tag:hover {
  transform: translateY(-2px);
}

.ghost-btn:focus-visible,
.primary-btn:focus-visible,
.danger-btn:focus-visible,
.chip:focus-visible,
.breadcrumb-chip:focus-visible,
.timeline-item:focus-visible,
.memory-item:focus-visible,
.timeline-board-item:focus-visible,
.cluster-item:focus-visible,
.photo-thumb:focus-visible {
  outline: 3px solid rgba(187, 77, 51, 0.2);
  outline-offset: 3px;
}

.primary-btn {
  background: linear-gradient(135deg, var(--dark) 0%, var(--primary) 100%);
  color: color-mix(in srgb, var(--light) 88%, white);
  box-shadow: 0 12px 28px color-mix(in srgb, var(--primary) 28%, transparent);
}

.primary-btn:disabled {
  background: color-mix(in srgb, var(--button-bg) 78%, var(--primary));
  color: var(--text-muted);
  box-shadow: none;
  opacity: 1;
  cursor: not-allowed;
}

.danger-btn {
  width: 100%;
  background: color-mix(in srgb, var(--accent) 14%, transparent);
  color: var(--accent);
}

.ghost-btn:disabled,
.primary-btn:disabled,
.danger-btn:disabled {
  cursor: not-allowed;
  transform: none;
}

.active-badge {
  background: var(--accent-soft);
  color: var(--accent);
}

.workspace {
  position: relative;
  z-index: 1;
  display: grid;
  grid-template-columns: minmax(260px, 340px) minmax(520px, 1fr) minmax(270px, 360px);
  gap: 24px;
  align-items: stretch;
  height: calc(100vh - 72px);
  height: calc(100dvh - 72px);
}

.workspace.empty-footprints {
  grid-template-columns: minmax(280px, 340px) minmax(0, 1fr);
}

.workspace.empty-footprints .sidebar {
  max-width: 340px;
}

/* 没有选中足迹时，地图更宽，右侧面板变轻 */
.workspace.no-selection {
  grid-template-columns: minmax(260px, 320px) minmax(580px, 1fr) minmax(240px, 300px);
}

.workspace.no-selection .detail-panel {
  opacity: 0.7;
  transform: scale(0.98);
}

@media (min-width: 769px) {
  .workspace {
    height: calc(100vh - 118px);
    height: calc(100dvh - 118px);
    min-height: 680px;
    display: block;
    overflow: hidden;
    border-radius: 36px;
  }

  .workspace.empty-footprints,
  .workspace.no-selection {
    display: block;
  }

  .workspace::after {
    content: '';
    position: absolute;
    inset: 0;
    z-index: 2;
    pointer-events: none;
    background:
      linear-gradient(90deg, rgba(21, 13, 7, 0.34), transparent 28%, transparent 70%, rgba(21, 13, 7, 0.3)),
      linear-gradient(180deg, rgba(21, 13, 7, 0.16), transparent 22%, rgba(21, 13, 7, 0.18));
    mix-blend-mode: multiply;
  }

  .map-stage {
    position: absolute;
    inset: 0;
    z-index: 1;
    height: auto;
    min-height: 0;
    padding: 0;
    border: none;
    border-radius: 36px;
    background: transparent;
    box-shadow: none;
  }

  .map-stage-header {
    position: absolute;
    left: 50%;
    top: 22px;
    z-index: 8;
    width: min(720px, calc(100% - 560px));
    min-width: 420px;
    transform: translateX(-50%);
    padding: 16px 18px;
    border: 1px solid color-mix(in srgb, var(--map-skin-border) 20%, transparent);
    border-radius: 28px;
    background:
      linear-gradient(135deg, rgba(255, 255, 255, 0.68), rgba(255, 255, 255, 0.28)),
      color-mix(in srgb, var(--panel-soft-bg) 72%, transparent);
    box-shadow: 0 18px 60px rgba(40, 28, 18, 0.18);
    backdrop-filter: blur(22px);
    -webkit-backdrop-filter: blur(22px);
  }

  .app-shell.immersive-space .map-stage-header {
    background:
      linear-gradient(135deg, rgba(255, 255, 255, 0.11), rgba(255, 255, 255, 0.035)),
      rgba(8, 13, 24, 0.58);
    border-color: rgba(255, 244, 224, 0.14);
    box-shadow: 0 24px 70px rgba(0, 0, 0, 0.34);
  }

  .map-stage-body {
    position: absolute;
    inset: 0;
    min-height: 100%;
    border-radius: 36px;
    border-color: color-mix(in srgb, var(--map-skin-border) 20%, transparent);
  }

  .sidebar,
  .detail-panel {
    position: absolute;
    top: 28px;
    bottom: 28px;
    z-index: 6;
    height: auto;
    width: min(360px, 29vw);
    background:
      linear-gradient(135deg, rgba(255, 255, 255, 0.7), rgba(255, 255, 255, 0.32)),
      color-mix(in srgb, var(--panel-strong-bg) 70%, transparent);
    border: 1px solid rgba(255, 255, 255, 0.42);
    box-shadow:
      inset 0 1px 0 rgba(255, 255, 255, 0.38),
      0 22px 72px rgba(44, 30, 17, 0.2);
    backdrop-filter: blur(24px) saturate(1.14);
    -webkit-backdrop-filter: blur(24px) saturate(1.14);
    transition:
      opacity 0.28s ease,
      transform 0.28s ease,
      border-color 0.28s ease,
      background 0.28s ease;
  }

  .sidebar {
    left: 28px;
  }

  .detail-panel {
    right: 28px;
  }

  .workspace.no-selection .detail-panel {
    opacity: 0.82;
    transform: none;
  }

  .workspace.empty-footprints .sidebar {
    display: none;
  }

  .workspace.empty-footprints .detail-panel {
    width: min(420px, 34vw);
  }

  .workspace.panels-collapsed .sidebar,
  .workspace.panels-collapsed .detail-panel {
    opacity: 0;
    pointer-events: none;
  }

  .workspace.panels-collapsed .sidebar {
    transform: translateX(-24px) scale(0.96);
  }

  .workspace.panels-collapsed .detail-panel {
    transform: translateX(24px) scale(0.96);
  }

  .workspace.panels-collapsed .map-stage-header {
    opacity: 0;
    pointer-events: none;
    transform: translate(-50%, -16px) scale(0.96);
  }
}

.sidebar,
.detail-panel {
  min-height: 0;
  height: 100%;
  border-radius: 32px;
  overflow-y: auto;
  overflow-x: hidden;
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 20px;
}

.sidebar::-webkit-scrollbar,
.detail-panel::-webkit-scrollbar {
  width: 6px;
}

.sidebar::-webkit-scrollbar-track,
.detail-panel::-webkit-scrollbar-track {
  background: transparent;
}

.sidebar::-webkit-scrollbar-thumb,
.detail-panel::-webkit-scrollbar-thumb {
  background: color-mix(in srgb, var(--panel-border) 60%, transparent);
  border-radius: 3px;
}

.sidebar::-webkit-scrollbar-thumb:hover,
.detail-panel::-webkit-scrollbar-thumb:hover {
  background: color-mix(in srgb, var(--accent) 30%, transparent);
}

.narrative-card,
.filter-card,
.timeline-card,
.memory-list-card {
  padding: 18px;
  border-radius: 24px;
  background: color-mix(in srgb, var(--panel-soft-bg) 78%, transparent);
  border: 1px solid var(--panel-border);
  transition: transform 0.22s ease, border-color 0.22s ease, background-color 0.22s ease;
}

.ai-memory-card {
  display: grid;
  gap: 12px;
  margin-bottom: 16px;
  padding: 16px;
  border: 1px solid color-mix(in srgb, var(--accent) 18%, var(--panel-border));
  border-radius: 22px;
  background:
    radial-gradient(circle at 100% 0, color-mix(in srgb, var(--accent) 16%, transparent), transparent 42%),
    color-mix(in srgb, var(--button-bg) 70%, transparent);
}

.ai-memory-card h3 {
  margin: 2px 0 8px;
  font-family: 'Noto Serif SC', 'Songti SC', 'Microsoft YaHei', serif;
  font-size: 1.18rem;
}

.ai-memory-card p {
  margin: 0;
  color: var(--text-muted);
  line-height: 1.65;
}

.ai-highlight-list {
  display: grid;
  gap: 8px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.ai-highlight-list li {
  padding: 8px 10px;
  border-radius: 14px;
  background: color-mix(in srgb, var(--button-bg) 72%, transparent);
  color: var(--text-main);
  font-size: 0.88rem;
}

.stat-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
}

.stat-card {
  padding: 18px;
  border-radius: 24px;
  background: color-mix(in srgb, var(--panel-soft-bg) 80%, transparent);
  border: 1px solid var(--panel-border);
  transition: transform 0.22s ease, border-color 0.22s ease, background 0.22s ease;
}

.stat-card:hover,
.region-card:hover,
.filter-card:hover,
.timeline-card:hover,
.memory-list-card:hover {
  transform: translateY(-2px);
  border-color: color-mix(in srgb, var(--accent) 26%, transparent);
  background-color: color-mix(in srgb, var(--panel-soft-bg) 92%, white);
}

.stat-card strong {
  display: block;
  margin: 8px 0 6px;
  font-family: 'Noto Serif SC', 'Songti SC', 'Microsoft YaHei', serif;
  font-size: 2rem;
}

.stat-label,
.legend-title {
  color: var(--text-muted);
  font-size: 0.82rem;
}

.accent-card {
  background: linear-gradient(135deg, var(--dark), var(--primary));
  color: color-mix(in srgb, var(--light) 88%, white);
}

.accent-card .stat-label,
.accent-card small {
  color: rgba(255, 247, 237, 0.75);
}

.region-card {
  padding: 18px;
  border-radius: 26px;
  background:
    linear-gradient(135deg, color-mix(in srgb, var(--panel-soft-bg) 92%, transparent), color-mix(in srgb, var(--accent-soft) 64%, transparent)),
    radial-gradient(circle at top right, color-mix(in srgb, var(--accent) 18%, transparent), transparent 34%);
  border: 1px solid var(--panel-border);
  transition: transform 0.22s ease, border-color 0.22s ease, background-color 0.22s ease;
}

.region-metrics {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
  margin: 14px 0;
}

.region-metrics div {
  padding: 12px;
  border-radius: 18px;
  background: color-mix(in srgb, var(--button-bg) 84%, transparent);
}

.region-metrics strong {
  display: block;
  font-family: 'Noto Serif SC', 'Songti SC', 'Microsoft YaHei', serif;
  font-size: 1.55rem;
}

.region-metrics span,
.region-card p {
  color: var(--text-muted);
  font-size: 0.86rem;
}

.section-heading {
  margin-bottom: 14px;
}

.search-controls {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 120px;
  gap: 10px;
  margin-bottom: 14px;
}

.ai-search-box {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 10px;
  margin-bottom: 12px;
}

.ai-action-btn {
  white-space: nowrap;
}

.ai-inline-note {
  margin: -2px 0 12px;
  color: var(--text-muted);
  font-size: 0.84rem;
  line-height: 1.5;
}

.search-input,
.year-select {
  width: 100%;
  min-height: 42px;
  border: 1px solid var(--panel-border);
  border-radius: 14px;
  background: var(--button-bg);
  padding: 10px 12px;
  font: inherit;
  color: var(--text-main);
}

.search-input:focus,
.year-select:focus {
  outline: 2px solid color-mix(in srgb, var(--accent) 18%, transparent);
  border-color: color-mix(in srgb, var(--accent) 34%, transparent);
}

.chip-group,
.tag-group,
.quick-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.chip {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 14px;
  border: 1px solid var(--panel-border);
  border-radius: 999px;
  background: var(--button-bg);
  color: var(--button-text);
  cursor: pointer;
  transition: all 0.25s ease;
}

.chip span {
  padding: 2px 8px;
  border-radius: 999px;
  background: var(--accent-soft);
  color: var(--accent);
  font-size: 0.82rem;
}

.photo-strip,
.timeline-board-list,
.overlay-card {
  scrollbar-width: thin;
  scrollbar-color: rgba(139, 115, 85, 0.22) transparent;
}

.photo-strip::-webkit-scrollbar,
.timeline-board-list::-webkit-scrollbar,
.overlay-card::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}

.photo-strip::-webkit-scrollbar-track,
.timeline-board-list::-webkit-scrollbar-track,
.overlay-card::-webkit-scrollbar-track {
  background: transparent;
}

.photo-strip::-webkit-scrollbar-thumb,
.timeline-board-list::-webkit-scrollbar-thumb,
.overlay-card::-webkit-scrollbar-thumb {
  border-radius: 999px;
  background: rgba(139, 115, 85, 0.2);
}

.photo-strip::-webkit-scrollbar-thumb:hover,
.timeline-board-list::-webkit-scrollbar-thumb:hover,
.overlay-card::-webkit-scrollbar-thumb:hover {
  background: rgba(139, 115, 85, 0.32);
}

.chip.active {
  background: var(--accent-soft);
  border-color: color-mix(in srgb, var(--accent) 34%, transparent);
}

.timeline-list,
.memory-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.timeline-item,
.memory-item {
  display: block;
  width: 100%;
  text-align: left;
  padding: 14px 16px;
  border: 1px solid var(--panel-border);
  border-radius: 18px;
  background: color-mix(in srgb, var(--button-bg) 88%, transparent);
  cursor: pointer;
  transition: all 0.25s ease;
}

.timeline-item.active,
.memory-item.active {
  background: var(--accent-soft);
  border-color: color-mix(in srgb, var(--accent) 34%, transparent);
}

.timeline-item small,
.memory-item small {
  display: block;
  margin-bottom: 4px;
  color: color-mix(in srgb, var(--primary) 86%, var(--accent));
}

.timeline-item strong,
.memory-item strong {
  display: block;
  margin-bottom: 4px;
  font-size: 1rem;
}

.empty-block {
  padding: 16px;
  border-radius: 18px;
  background: color-mix(in srgb, var(--button-bg) 72%, transparent);
  color: var(--text-muted);
}

/* 空数据引导卡片 */
.empty-state-overlay {
  position: fixed;
  inset: 0;
  z-index: 100;
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: none;
}

.empty-guide-card {
  position: relative;
  max-width: 420px;
  padding: 32px;
  border-radius: 32px;
  text-align: center;
  pointer-events: auto;
  margin-top: -80px;
}

.guide-close {
  position: absolute;
  top: 14px;
  right: 14px;
  width: 34px;
  height: 34px;
  border: 1px solid var(--panel-border);
  border-radius: 50%;
  background: var(--button-bg);
  color: var(--button-text);
  cursor: pointer;
  font-size: 1.25rem;
  line-height: 1;
  transition: transform 0.2s ease, background 0.2s ease;
}

.guide-close:hover {
  transform: rotate(8deg) scale(1.04);
  background: rgba(187, 77, 51, 0.12);
}

.guide-icon {
  font-size: 4rem;
  margin-bottom: 16px;
}

.empty-guide-card h2 {
  margin: 0 0 12px;
  font-family: 'Noto Serif SC', serif;
  font-size: 1.6rem;
}

.empty-guide-card p {
  margin: 0 0 24px;
  color: var(--text-muted);
  line-height: 1.6;
}

.guide-steps {
  display: flex;
  justify-content: center;
  gap: 24px;
  margin-bottom: 24px;
}

.guide-step {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

.step-num {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: linear-gradient(135deg, var(--dark) 0%, var(--primary) 100%);
  color: color-mix(in srgb, var(--light) 88%, white);
  font-weight: 600;
  display: flex;
  align-items: center;
  justify-content: center;
}

.step-text {
  font-size: 0.85rem;
  color: var(--text-muted);
}

/* Toast 提示 */
.toast-container {
  position: fixed;
  right: 24px;
  bottom: 24px;
  z-index: 420;
  display: flex;
  align-items: center;
  gap: 10px;
  max-width: min(420px, calc(100vw - 48px));
  padding: 12px 16px;
  border-radius: 20px;
  backdrop-filter: blur(16px);
  pointer-events: none;
  font-weight: 500;
}

.toast-container.success {
  background: rgba(74, 155, 124, 0.95);
  color: #fff;
  box-shadow: 0 8px 32px rgba(74, 155, 124, 0.4);
}

.toast-container.error {
  background: rgba(187, 77, 51, 0.95);
  color: #fff;
  box-shadow: 0 8px 32px rgba(187, 77, 51, 0.4);
}

.toast-container.info {
  background: rgba(255, 252, 247, 0.95);
  color: #241a13;
  box-shadow: 0 8px 32px rgba(139, 115, 85, 0.3);
}

.toast-icon {
  font-size: 1.2rem;
}

.toast-slide-enter-active {
  transition: all 0.3s ease-out;
}

.toast-slide-leave-active {
  transition: all 0.2s ease-in;
}

.toast-slide-enter-from {
  opacity: 0;
  transform: translateY(14px);
}

.toast-slide-leave-to {
  opacity: 0;
  transform: translateY(14px);
}

.system-notice {
  z-index: 4;
  display: flex;
  align-items: center;
  gap: 10px;
  width: fit-content;
  max-width: min(760px, 100%);
  margin: -2px 0 14px;
  padding: 10px 12px 10px 14px;
  border-radius: 999px;
  color: var(--text-main);
}

.system-notice.error {
  border-color: color-mix(in srgb, var(--accent) 24%, transparent);
  background: color-mix(in srgb, var(--accent-soft) 64%, var(--panel-soft-bg));
}

.notice-dot {
  width: 9px;
  height: 9px;
  border-radius: 999px;
  background: var(--accent);
  box-shadow: 0 0 0 5px color-mix(in srgb, var(--accent) 14%, transparent);
}

.notice-copy {
  color: var(--text-muted);
  font-size: 0.92rem;
}

.notice-close {
  border: none;
  border-radius: 999px;
  background: var(--button-bg);
  color: var(--button-text);
  cursor: pointer;
  font: inherit;
  padding: 6px 10px;
}

.notice-slide-enter-active,
.notice-slide-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}

.notice-slide-enter-from,
.notice-slide-leave-to {
  opacity: 0;
  transform: translateY(-6px);
}

.map-stage {
  padding: 14px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  min-height: 0;
  height: 100%;
}

.map-stage-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 10px;
  flex-shrink: 0;
}

.map-stage-header h2 {
  font-size: clamp(1.55rem, 2vw, 2.15rem);
}

.stage-subcopy {
  max-width: 42rem;
  margin: 4px 0 0;
  color: var(--text-muted);
  line-height: 1.45;
}

.map-stage-body {
  position: relative;
  isolation: isolate;
  flex: 1;
  min-height: 0;
  overflow: hidden;
  border-radius: 26px;
  background: var(--map-stage-bg);
  border: 1px solid color-mix(in srgb, var(--map-skin-border) 28%, transparent);
  box-shadow:
    inset 0 0 0 1px rgba(255, 255, 255, 0.12),
    inset 0 -38px 90px rgba(20, 12, 6, 0.16),
    0 22px 58px color-mix(in srgb, var(--dark) 20%, transparent);
  cursor: grab;
  touch-action: none;
}

.map-stage-body:active {
  cursor: grabbing;
}

.map-stage-body::before,
.map-stage-body::after {
  content: '';
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.map-stage-body::before {
  z-index: 0;
  opacity: 0.52;
  background-image:
    radial-gradient(ellipse at 50% 55%, transparent 0 44%, rgba(255, 255, 255, 0.12) 45%, transparent 46%),
    repeating-radial-gradient(ellipse at 50% 55%, transparent 0 52px, rgba(255, 255, 255, 0.08) 54px, transparent 56px),
    linear-gradient(rgba(255, 255, 255, 0.13) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255, 255, 255, 0.11) 1px, transparent 1px);
  background-size: 100% 100%, 100% 100%, 58px 58px, 58px 58px;
  mask-image: radial-gradient(circle at center, black, transparent 78%);
}

.map-stage-body::after {
  z-index: 1;
  opacity: 0.68;
  box-shadow: inset 0 0 110px rgba(31, 21, 13, 0.24);
  background:
    radial-gradient(ellipse at 38% 30%, rgba(255, 255, 255, 0.34), transparent 24%),
    radial-gradient(ellipse at 62% 72%, rgba(0, 0, 0, 0.18), transparent 34%),
    radial-gradient(circle at 50% 48%, transparent 0, transparent 40%, rgba(255, 255, 255, 0.2) 75%),
    radial-gradient(circle at 82% 16%, var(--map-skin-glow), transparent 26%);
  mix-blend-mode: soft-light;
}

.map-stage-body.skin-night::before {
  opacity: 0.22;
  background-image:
    radial-gradient(ellipse at 50% 55%, transparent 0 44%, rgba(255, 235, 190, 0.14) 45%, transparent 46%),
    repeating-radial-gradient(ellipse at 50% 55%, transparent 0 58px, rgba(255, 235, 190, 0.08) 60px, transparent 62px),
    radial-gradient(circle, rgba(255, 235, 190, 0.72) 0 1px, transparent 1.5px),
    linear-gradient(rgba(255, 255, 255, 0.06) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255, 255, 255, 0.05) 1px, transparent 1px);
  background-size: 100% 100%, 100% 100%, 120px 120px, 64px 64px, 64px 64px;
}

.map-stage-body.skin-night {
  --map-panel-bg: rgba(8, 13, 22, 0.9);
}

.map-stage-body.space-view {
  background:
    radial-gradient(circle at 50% 52%, rgba(91, 144, 255, 0.2), transparent 22%),
    radial-gradient(circle at 18% 18%, rgba(255, 205, 134, 0.16), transparent 18%),
    radial-gradient(circle at 82% 22%, rgba(112, 183, 255, 0.12), transparent 20%),
    radial-gradient(circle at 70% 84%, rgba(255, 138, 69, 0.1), transparent 24%),
    linear-gradient(145deg, #040812 0%, #0b1424 48%, #150d1f 100%);
  border-color: rgba(180, 207, 255, 0.18);
  box-shadow:
    inset 0 0 0 1px rgba(255, 255, 255, 0.08),
    inset 0 -46px 120px rgba(0, 0, 0, 0.45),
    0 26px 70px rgba(4, 8, 18, 0.38);
}

.map-stage-body.space-view::before {
  opacity: 0.9;
  background-image:
    radial-gradient(circle at 6% 17%, rgba(255, 255, 255, 0.86) 0 1.1px, transparent 1.8px),
    radial-gradient(circle at 11% 74%, rgba(255, 235, 190, 0.72) 0 1px, transparent 1.6px),
    radial-gradient(circle at 18% 43%, rgba(194, 221, 255, 0.68) 0 0.9px, transparent 1.5px),
    radial-gradient(circle at 27% 12%, rgba(255, 255, 255, 0.76) 0 1px, transparent 1.7px),
    radial-gradient(circle at 31% 68%, rgba(255, 241, 208, 0.58) 0 1.2px, transparent 2px),
    radial-gradient(circle at 39% 28%, rgba(220, 236, 255, 0.8) 0 0.8px, transparent 1.5px),
    radial-gradient(circle at 46% 83%, rgba(255, 255, 255, 0.7) 0 1px, transparent 1.7px),
    radial-gradient(circle at 52% 18%, rgba(255, 224, 172, 0.64) 0 0.9px, transparent 1.5px),
    radial-gradient(circle at 58% 58%, rgba(255, 255, 255, 0.84) 0 1.1px, transparent 1.9px),
    radial-gradient(circle at 64% 8%, rgba(196, 222, 255, 0.66) 0 0.8px, transparent 1.5px),
    radial-gradient(circle at 69% 36%, rgba(255, 255, 255, 0.72) 0 1px, transparent 1.7px),
    radial-gradient(circle at 76% 77%, rgba(255, 232, 186, 0.68) 0 1px, transparent 1.8px),
    radial-gradient(circle at 82% 22%, rgba(219, 237, 255, 0.74) 0 0.9px, transparent 1.6px),
    radial-gradient(circle at 88% 61%, rgba(255, 255, 255, 0.82) 0 1.1px, transparent 1.9px),
    radial-gradient(circle at 94% 33%, rgba(255, 240, 210, 0.62) 0 0.9px, transparent 1.6px),
    radial-gradient(circle at 9% 91%, rgba(180, 212, 255, 0.58) 0 0.8px, transparent 1.5px),
    radial-gradient(circle at 21% 82%, rgba(255, 255, 255, 0.48) 0 0.8px, transparent 1.4px),
    radial-gradient(circle at 73% 49%, rgba(255, 255, 255, 0.5) 0 0.8px, transparent 1.5px),
    radial-gradient(circle at 92% 88%, rgba(255, 226, 174, 0.58) 0 0.9px, transparent 1.6px),
    radial-gradient(circle at 72% 30%, rgba(94, 157, 255, 0.26), transparent 18%),
    radial-gradient(circle at 24% 66%, rgba(255, 138, 69, 0.12), transparent 22%),
    linear-gradient(120deg, transparent 0 40%, rgba(255, 255, 255, 0.08) 50%, transparent 60%);
  background-size: auto;
  mask-image: none;
}

.map-stage-body.space-view::after {
  opacity: 0.8;
  background:
    radial-gradient(circle at 50% 52%, transparent 0 28%, rgba(44, 101, 184, 0.18) 45%, transparent 62%),
    radial-gradient(ellipse at 50% 54%, transparent 0 42%, rgba(255, 255, 255, 0.18) 56%, transparent 64%),
    radial-gradient(circle at 78% 16%, rgba(255, 228, 168, 0.18), transparent 20%);
  mix-blend-mode: screen;
}

.map-stage-body.space-view .maplibre-container {
  filter:
    drop-shadow(0 0 30px rgba(111, 171, 255, 0.28))
    drop-shadow(0 28px 56px rgba(0, 0, 0, 0.36));
}

.map-stage-body.space-view .map-overlay-card,
.map-stage-body.space-view .legend-card {
  background: rgba(8, 13, 24, 0.68);
  border-color: rgba(220, 236, 255, 0.16);
  color: rgba(255, 244, 220, 0.92);
}

.map-stage-body.space-view .floating-badge,
.map-stage-body.space-view .overlay-toggle,
.map-stage-body.space-view .context-pill {
  background: rgba(255, 236, 196, 0.12);
  border-color: rgba(255, 236, 196, 0.14);
  color: rgba(255, 244, 220, 0.9);
}

.map-stage-body.space-view .map-overlay-card h3,
.map-stage-body.space-view .legend-card {
  color: rgba(255, 244, 220, 0.92);
}

.map-stage-body.space-view .map-overlay-card p,
.map-stage-body.space-view .legend-row {
  color: rgba(255, 244, 220, 0.74);
}

.map-stage-body.skin-night .context-pill,
.map-stage-body.skin-night .overlay-toggle {
  background: rgba(255, 236, 196, 0.12);
}

.map-stage-body.transitioning .maplibre-container {
  filter: saturate(0.92) blur(1px);
  transform: translateZ(0) scale(1.01);
}

/* 地图选点提示 */
.location-picker-tip {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  z-index: 10;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 16px 24px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.92);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.25);
}

.location-picker-tip span {
  font-size: 16px;
  font-weight: 500;
  color: #333;
}

.location-picker-tip .cancel-btn {
  padding: 8px 20px;
  border: none;
  border-radius: 8px;
  background: #f5f5f5;
  color: #666;
  font-size: 14px;
  cursor: pointer;
  transition: background 0.2s;
}

.location-picker-tip .cancel-btn:hover {
  background: #e5e5e5;
}

.maplibre-container {
  position: absolute;
  inset: 0;
  z-index: 1;
  width: 100%;
  height: 100%;
  min-height: 100%;
  touch-action: none;
  transform: translateZ(0);
  filter: drop-shadow(0 20px 32px color-mix(in srgb, var(--map-skin-glow) 46%, transparent));
  transition: filter 0.25s ease, transform 0.25s ease;
}

.maplibre-container.muted {
  opacity: 0.12;
  filter: blur(2px) saturate(0.78);
  pointer-events: none;
}

.journey-vehicle-marker {
  --vehicle-color: #4a90d9;
  --vehicle-halo: rgba(74, 144, 217, 0.28);
  --vehicle-glass: rgba(255, 255, 255, 0.84);
  --vehicle-rotate: 0deg;
  position: relative;
  width: 34px;
  height: 34px;
  border-radius: 999px;
  color: var(--vehicle-color);
  filter: drop-shadow(0 10px 18px rgba(0, 0, 0, 0.2));
  pointer-events: auto;
  cursor: pointer;
  transform: translateZ(0);
}

.journey-vehicle-marker::before {
  content: '';
  position: absolute;
  inset: -9px;
  border-radius: inherit;
  background: radial-gradient(circle, var(--vehicle-halo), transparent 68%);
  animation: journeyVehiclePulse 1.8s ease-in-out infinite;
}

.journey-vehicle-trail {
  position: absolute;
  left: -18px;
  top: 50%;
  width: 28px;
  height: 3px;
  border-radius: 999px;
  background: linear-gradient(90deg, transparent, var(--vehicle-color));
  opacity: 0.72;
  transform: translateY(-50%) rotate(var(--vehicle-rotate));
  transform-origin: right center;
}

.journey-vehicle-glyph {
  position: absolute;
  inset: 3px;
  display: grid;
  place-items: center;
  border: 1px solid color-mix(in srgb, var(--vehicle-color) 38%, transparent);
  border-radius: inherit;
  background:
    radial-gradient(circle at 32% 24%, rgba(255, 255, 255, 0.62), transparent 34%),
    var(--vehicle-glass);
  box-shadow:
    inset 0 0 0 1px rgba(255, 255, 255, 0.22),
    0 10px 24px var(--vehicle-halo);
  transform: rotate(var(--vehicle-rotate));
}

.journey-vehicle-glyph svg {
  width: 18px;
  height: 18px;
  fill: currentColor;
}

.journey-vehicle-flight {
  width: 40px;
  height: 40px;
  filter: drop-shadow(0 18px 22px rgba(0, 0, 0, 0.26));
  animation: flightFloat 2.2s ease-in-out infinite;
}

.journey-vehicle-flight .journey-vehicle-trail {
  left: -26px;
  width: 38px;
  height: 4px;
  opacity: 0.78;
}

.journey-vehicle-train .journey-vehicle-trail {
  background: repeating-linear-gradient(90deg, var(--vehicle-color) 0 6px, transparent 6px 11px);
}

.journey-vehicle-ship .journey-vehicle-trail {
  height: 6px;
  background:
    radial-gradient(circle at 20% 50%, var(--vehicle-color) 0 2px, transparent 3px),
    radial-gradient(circle at 50% 50%, var(--vehicle-color) 0 2px, transparent 3px),
    radial-gradient(circle at 80% 50%, var(--vehicle-color) 0 2px, transparent 3px);
}

@keyframes journeyVehiclePulse {
  0%,
  100% {
    opacity: 0.42;
    transform: scale(0.86);
  }
  50% {
    opacity: 0.86;
    transform: scale(1.1);
  }
}

@keyframes flightFloat {
  0%,
  100% {
    margin-top: -5px;
  }
  50% {
    margin-top: -12px;
  }
}

.map-texture-loader {
  position: absolute;
  inset: 0;
  z-index: 3;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  pointer-events: none;
  color: rgba(255, 244, 220, 0.92);
  background:
    radial-gradient(circle at 50% 50%, rgba(91, 144, 255, 0.12), transparent 23%),
    radial-gradient(circle at center, transparent 0 34%, rgba(4, 8, 18, 0.1) 44%, rgba(4, 8, 18, 0.45) 76%);
  text-align: center;
}

.map-texture-loader strong {
  font-family: 'Noto Serif SC', serif;
  font-size: 1.08rem;
  letter-spacing: 0.02em;
}

.map-texture-loader small {
  color: rgba(255, 244, 220, 0.68);
}

.texture-orbit {
  width: 54px;
  height: 54px;
  border-radius: 50%;
  border: 1px solid rgba(255, 244, 220, 0.28);
  border-top-color: rgba(255, 244, 220, 0.9);
  box-shadow: 0 0 34px rgba(91, 144, 255, 0.28);
  animation: spin 1.1s linear infinite;
}

.picked-location-marker {
  width: 22px;
  height: 22px;
  border: 3px solid var(--picked-border, #fff);
  border-radius: 999px;
  background: var(--picked-color, #c94f35);
  box-shadow:
    0 0 0 8px color-mix(in srgb, var(--picked-halo, rgba(201, 79, 53, 0.38)) 46%, transparent),
    0 12px 24px rgba(0, 0, 0, 0.24);
}

.picked-location-marker::after {
  content: '';
  position: absolute;
  left: 50%;
  top: 100%;
  width: 2px;
  height: 14px;
  transform: translateX(-50%);
  border-radius: 999px;
  background: var(--picked-color, #c94f35);
}

/* MapLibre GL 样式覆盖 */
.maplibre-container .maplibregl-ctrl-group {
  background: rgba(255, 248, 236, 0.82);
  border-radius: 12px;
  box-shadow: 0 4px 12px rgba(139, 89, 54, 0.18);
}

.maplibre-container .maplibregl-ctrl-group button {
  width: 36px;
  height: 36px;
  border-radius: 8px;
}

.maplibre-container .maplibregl-ctrl-group button + button {
  border-top: 1px solid rgba(139, 89, 54, 0.14);
}

.map-stage-body.skin-night .maplibre-container .maplibregl-ctrl-group {
  background: rgba(13, 19, 31, 0.76);
  box-shadow: 0 4px 12px rgba(226, 184, 106, 0.18);
}

.map-stage-body.skin-night .maplibre-container .maplibregl-ctrl-group button + button {
  border-top-color: rgba(226, 184, 106, 0.18);
}

.map-transition-overlay {
  position: absolute;
  inset: 0;
  z-index: 4;
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: none;
  background: rgba(255, 250, 243, 0.42);
  backdrop-filter: blur(2px);
}

.map-transition-overlay span {
  padding: 10px 14px;
  border-radius: 999px;
  background: rgba(255, 252, 247, 0.88);
  border: 1px solid rgba(139, 115, 85, 0.12);
  color: var(--text-main);
}

.map-overlay-card,
.legend-card {
  position: absolute;
  z-index: 2;
  border-radius: 24px;
  padding: 16px;
}

.map-overlay-card {
  left: 18px;
  top: 18px;
  max-width: 24rem;
  background: var(--map-panel-bg);
  border: 1px solid color-mix(in srgb, var(--map-skin-border) 32%, transparent);
  box-shadow: 0 18px 42px rgba(36, 26, 19, 0.13);
  backdrop-filter: blur(18px);
  color: var(--map-skin-label);
  transition: max-width 0.22s ease, padding 0.22s ease, background 0.22s ease, transform 0.22s ease;
}

.map-overlay-card.collapsed {
  max-width: min(21rem, calc(100% - 36px));
  padding: 12px 14px;
}

.map-overlay-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  width: 100%;
  margin-bottom: 8px;
  border: none;
  background: transparent;
  color: inherit;
  cursor: pointer;
  font: inherit;
  padding: 0;
  text-align: left;
}

.map-overlay-head:focus-visible {
  outline: 2px solid color-mix(in srgb, var(--map-skin-border) 44%, transparent);
  outline-offset: 3px;
  border-radius: 14px;
}

.map-overlay-card h3 {
  margin: 0 0 10px;
  font-family: 'Noto Serif SC', serif;
  font-size: 1.3rem;
  color: var(--map-skin-label);
}

.map-overlay-card.collapsed h3 {
  margin-bottom: 0;
  font-size: 1.05rem;
}

.map-overlay-card p {
  color: color-mix(in srgb, var(--map-skin-label) 76%, transparent);
}

.overlay-toggle {
  flex: 0 0 auto;
  border: 1px solid color-mix(in srgb, var(--map-skin-border) 26%, transparent);
  border-radius: 999px;
  background: color-mix(in srgb, var(--map-panel-bg) 78%, white);
  color: var(--map-skin-label);
  font-size: 0.76rem;
  padding: 5px 9px;
  transition: transform 0.2s ease, border-color 0.2s ease, background 0.2s ease;
}

.map-overlay-head:hover .overlay-toggle {
  transform: translateY(-1px);
  border-color: color-mix(in srgb, var(--map-skin-border) 46%, transparent);
}

.floating-badge {
  display: inline-flex;
  margin-bottom: 0;
  padding: 6px 10px;
  border-radius: 999px;
  background: color-mix(in srgb, var(--map-skin-border) 16%, transparent);
  color: var(--map-skin-label);
  font-size: 0.78rem;
}

.context-pills {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 14px;
}

.context-pill {
  padding: 8px 12px;
  border-radius: 999px;
  background: color-mix(in srgb, var(--map-panel-bg) 78%, white);
  border: 1px solid color-mix(in srgb, var(--map-skin-border) 20%, transparent);
  color: var(--map-skin-label);
}

.map-tooltip {
  position: absolute;
  min-width: 200px;
  padding: 16px 20px;
  border-radius: 20px;
  pointer-events: none;
  box-shadow: 0 12px 40px rgba(139, 115, 85, 0.25);
  border: 1px solid rgba(187, 77, 51, 0.2);
  animation: tooltipFade 0.15s ease-out;
}

.tooltip-title {
  display: block;
  font-family: 'Noto Serif SC', serif;
  font-size: 1.1rem;
  font-weight: 600;
}

.tooltip-subtitle {
  display: block;
  margin-top: 6px;
  color: rgba(187, 77, 51, 0.85);
  font-size: 0.88rem;
}

@keyframes tooltipFade {
  from {
    opacity: 0;
    transform: translateY(4px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.collection-tip {
  margin-bottom: 12px;
  padding: 12px 14px;
  border-radius: 16px;
  background: color-mix(in srgb, var(--button-bg) 72%, transparent);
  color: var(--text-muted);
}

.legend-card {
  right: 18px;
  bottom: 18px;
  min-width: 180px;
  background: linear-gradient(135deg, var(--map-panel-bg), color-mix(in srgb, var(--map-skin-glow) 15%, transparent));
  border: 1px solid color-mix(in srgb, var(--map-skin-border) 28%, transparent);
  backdrop-filter: blur(18px);
  color: var(--map-skin-label);
  box-shadow: 0 18px 42px rgba(36, 26, 19, 0.13), inset 0 0 0 1px rgba(255, 255, 255, 0.08);
  transition: min-width 0.2s ease, padding 0.2s ease, border-radius 0.2s ease;
}

.legend-card.collapsed {
  min-width: 0;
  padding: 8px;
  border-radius: 999px;
}

.legend-card.collapsed > .legend-title,
.legend-card.collapsed .legend-row {
  display: none;
}

.legend-toggle {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  width: 100%;
  border: none;
  border-radius: 999px;
  background: transparent;
  color: inherit;
  cursor: pointer;
  font: inherit;
  padding: 0;
}

.legend-toggle span:last-child {
  padding: 4px 8px;
  border-radius: 999px;
  background: color-mix(in srgb, var(--map-skin-border) 14%, transparent);
  color: color-mix(in srgb, var(--map-skin-label) 82%, transparent);
  font-size: 0.72rem;
}

.legend-title-clean {
  color: var(--map-skin-label);
  font-size: 0.85rem;
  font-weight: 600;
}

.legend-title {
  font-size: 0.85rem;
  font-weight: 600;
  letter-spacing: 0.02em;
  color: var(--map-skin-label);
}

.legend-row {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 8px;
  font-size: 0.8rem;
  opacity: 0.85;
}

.legend-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: var(--accent);
  box-shadow: 0 0 0 3px var(--map-skin-glow), 0 1px 3px rgba(0, 0, 0, 0.2);
}

.legend-dot.strong {
  width: 12px;
  height: 12px;
  background: var(--accent);
  box-shadow: 0 0 0 4px color-mix(in srgb, var(--accent) 18%, transparent), 0 2px 6px rgba(0, 0, 0, 0.3);
}

.legend-line {
  width: 24px;
  height: 2px;
  background: linear-gradient(90deg, transparent, var(--accent), transparent);
  border-radius: 1px;
}

.timeline-board {
  position: absolute;
  inset: 18px;
  z-index: 3;
  display: flex;
  flex-direction: column;
  gap: 18px;
  min-height: 0;
  padding: 22px;
  overflow: hidden;
  border-radius: 24px;
  background: color-mix(in srgb, var(--panel-strong-bg) 92%, transparent);
  border: 1px solid var(--panel-border);
  backdrop-filter: blur(16px);
}

.timeline-board-header h3 {
  margin: 6px 0 8px;
  font-family: 'Noto Serif SC', serif;
  font-size: 1.65rem;
}

.timeline-board-header p {
  max-width: 44rem;
  margin: 0;
  color: var(--text-muted);
}

.timeline-board-list {
  display: grid;
  gap: 18px;
  min-height: 0;
  overflow: auto;
  padding-right: 6px;
}

.timeline-year-group {
  display: grid;
  grid-template-columns: 90px minmax(0, 1fr);
  gap: 14px;
  align-items: start;
}

.timeline-year {
  position: sticky;
  top: 0;
  padding: 10px 12px;
  border-radius: 999px;
  text-align: center;
  font-family: 'Noto Serif SC', 'Songti SC', 'Microsoft YaHei', serif;
  font-size: 1.25rem;
  color: #fff8ef;
  background: linear-gradient(135deg, #2f2116, #8f5c2e);
}

.timeline-board-item {
  display: grid;
  gap: 5px;
  width: 100%;
  margin-bottom: 10px;
  padding: 15px 18px;
  border: 1px solid rgba(139, 115, 85, 0.1);
  border-radius: 20px;
  background: rgba(255, 255, 255, 0.66);
  text-align: left;
  cursor: pointer;
  transition: transform 0.22s ease, border-color 0.22s ease, background 0.22s ease;
  font: inherit;
}

.timeline-board-item:hover,
.timeline-board-item.active {
  transform: translateX(4px);
  border-color: rgba(187, 77, 51, 0.28);
  background: rgba(255, 248, 239, 0.9);
}

.timeline-board-item span,
.timeline-board-item small,
.timeline-board-item p {
  color: var(--text-muted);
}

.timeline-board-item strong {
  font-family: 'Noto Serif SC', serif;
  font-size: 1.12rem;
}

.timeline-board-item p {
  margin: 0;
}

.timeline-empty {
  margin-top: 12px;
}

.hero-photo {
  min-height: 220px;
  border-radius: 28px;
  overflow: hidden;
  background-position: center;
  background-size: cover;
  position: relative;
}

.hero-badges {
  position: absolute;
  left: 18px;
  bottom: 18px;
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.hero-badges span,
.tag {
  padding: 8px 12px;
  border-radius: 999px;
  background: rgba(255, 252, 247, 0.84);
}

.tag {
  background: rgba(157, 106, 47, 0.1);
  border: 1px solid rgba(157, 106, 47, 0.12);
}

.photo-strip {
  display: flex;
  gap: 10px;
  overflow: auto;
  padding-bottom: 4px;
  scroll-snap-type: x proximity;
}

.photo-thumb {
  position: relative;
  flex: 0 0 auto;
  width: 72px;
  height: 72px;
  padding: 0;
  border: 2px solid transparent;
  border-radius: 16px;
  overflow: hidden;
  background: rgba(255, 255, 255, 0.5);
  cursor: pointer;
  scroll-snap-align: start;
  transition: transform 0.22s ease, border-color 0.22s ease, box-shadow 0.22s ease;
}

.photo-thumb.active {
  border-color: var(--accent);
  box-shadow: 0 10px 22px rgba(187, 77, 51, 0.14);
}

.photo-thumb:hover {
  transform: translateY(-2px);
}

.photo-thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.cover-badge {
  position: absolute;
  left: 6px;
  bottom: 6px;
  padding: 3px 6px;
  border-radius: 999px;
  background: rgba(47, 33, 22, 0.78);
  color: #fff8ef;
  font-size: 0.7rem;
}

.photo-tools {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 8px;
  padding: 10px;
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.52);
  border: 1px solid rgba(139, 115, 85, 0.1);
}

.photo-tools .ghost-btn,
.photo-tools .danger-btn {
  width: auto;
  padding: 9px 10px;
  font-size: 0.82rem;
}

.compact-danger {
  border-radius: 999px;
}

.detail-empty {
  display: grid;
  gap: 12px;
  padding: 8px 0 12px;
}

.idle-detail-panel {
  background:
    radial-gradient(circle at 80% 8%, color-mix(in srgb, var(--accent) 14%, transparent), transparent 30%),
    var(--panel-strong-bg);
}

.detail-empty-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 4px;
}

.detail-empty-actions .ghost-btn,
.detail-empty-actions .primary-btn {
  flex: 1 1 130px;
  justify-content: center;
}

.detail-empty-actions .primary-btn[disabled] {
  display: none;
}

.detail-empty-note {
  color: var(--text-muted);
  line-height: 1.6;
}

.cluster-summary {
  padding: 16px;
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.58);
  border: 1px solid rgba(139, 115, 85, 0.1);
}

.cluster-summary strong {
  display: block;
  margin-bottom: 6px;
  font-family: 'Noto Serif SC', serif;
}

.cluster-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.cluster-item {
  display: block;
  width: 100%;
  text-align: left;
  border: 1px solid rgba(139, 115, 85, 0.1);
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.65);
  padding: 14px 16px;
  cursor: pointer;
  font: inherit;
  transition: all 0.2s ease;
}

.cluster-item:hover {
  transform: translateY(-2px);
  border-color: color-mix(in srgb, var(--accent) 34%, transparent);
}

.cluster-item small {
  display: block;
  margin-bottom: 4px;
  color: color-mix(in srgb, var(--primary) 86%, var(--accent));
}

.cluster-item strong {
  display: block;
  margin-bottom: 4px;
}

.cluster-item p {
  margin: 0;
  color: var(--text-muted);
}

.full-width {
  width: 100%;
  justify-content: center;
}

.overlay-shell {
  position: fixed;
  inset: 0;
  z-index: 300;
  background:
    radial-gradient(circle at 50% 28%, rgba(255, 229, 183, 0.14), transparent 30%),
    rgba(20, 12, 8, 0.42);
  backdrop-filter: blur(18px) saturate(1.08);
  -webkit-backdrop-filter: blur(18px) saturate(1.08);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
}

.modal-card,
.theme-panel,
.auth-panel {
  width: min(720px, 100%);
  max-height: 86vh;
  overflow: auto;
  padding: 28px;
  border-radius: 28px;
  background:
    linear-gradient(145deg, rgba(255, 255, 255, 0.84), rgba(255, 250, 241, 0.62)),
    color-mix(in srgb, var(--panel-strong-bg) 82%, transparent);
  border: 1px solid rgba(255, 255, 255, 0.48);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.5),
    0 34px 90px rgba(38, 23, 12, 0.26);
}

.theme-panel,
.auth-panel {
  width: min(520px, 100%);
}

.modal-header {
  margin-bottom: 20px;
  text-align: center;
}

.modal-header h3 {
  font-size: clamp(1.65rem, 2.4vw, 2.35rem);
}

.form-intro-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
  margin-bottom: 18px;
}

.helper-card {
  padding: 16px;
  border-radius: 20px;
  background:
    linear-gradient(135deg, rgba(255, 255, 255, 0.46), rgba(255, 255, 255, 0.18)),
    color-mix(in srgb, var(--button-bg) 72%, transparent);
  border: 1px solid var(--panel-border);
}

.helper-card strong {
  display: block;
  margin-bottom: 6px;
  font-family: 'Noto Serif SC', serif;
}

.helper-card-accent {
  background: linear-gradient(135deg, var(--accent-soft), color-mix(in srgb, var(--button-bg) 76%, transparent));
}

.form-grid,
.theme-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
  margin-bottom: 18px;
}

.field-control,
.field-block textarea,
.field-block input,
.field-block select {
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.74), rgba(255, 255, 255, 0.46)),
    color-mix(in srgb, var(--button-bg) 74%, transparent);
  border-color: color-mix(in srgb, var(--panel-border) 66%, transparent);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.36);
}

.field-control:focus,
.field-block textarea:focus,
.field-block input:focus,
.field-block select:focus {
  outline: none;
  border-color: color-mix(in srgb, var(--accent) 48%, transparent);
  box-shadow:
    0 0 0 4px color-mix(in srgb, var(--accent) 16%, transparent),
    inset 0 1px 0 rgba(255, 255, 255, 0.46);
}

/* 坐标选点 */
.coord-picker {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 14px;
  border-radius: 12px;
  background: color-mix(in srgb, var(--button-bg) 72%, transparent);
  border: 1px solid var(--panel-border);
}

.coord-picker span {
  flex: 1;
  font-size: 14px;
  color: var(--text-main);
}

.coord-placeholder {
  color: var(--text-muted);
}

.coord-picker .pick-btn {
  padding: 8px 16px;
  border: none;
  border-radius: 8px;
  background: var(--accent);
  color: var(--light);
  font-size: 13px;
  cursor: pointer;
  transition: background 0.2s;
}

.coord-picker .pick-btn:hover {
  background: color-mix(in srgb, var(--accent) 85%, #000);
}

.mini-btn {
  padding: 4px 10px;
  border: none;
  border-radius: 6px;
  background: var(--panel-border);
  color: var(--text-muted);
  font-size: 12px;
  cursor: pointer;
  margin-top: 8px;
  transition: background 0.2s;
}

.mini-btn:hover {
  background: color-mix(in srgb, var(--panel-border) 70%, var(--accent));
}

.field-block {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.field-block span {
  font-family: 'Noto Serif SC', serif;
}

.field-title-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.field-title-row .mini-btn {
  margin-top: 0;
  flex: 0 0 auto;
}

.full-span {
  grid-column: 1 / -1;
}

.field-control {
  width: 100%;
  border: 1px solid var(--panel-border);
  border-radius: 16px;
  background: var(--button-bg);
  padding: 14px 16px;
  font: inherit;
  color: var(--text-main);
}

.field-control:focus {
  outline: 2px solid color-mix(in srgb, var(--accent) 18%, transparent);
  border-color: color-mix(in srgb, var(--accent) 34%, transparent);
}

.textarea {
  resize: vertical;
}

.quick-tag {
  border: 1px solid var(--panel-border);
  border-radius: 999px;
  background: var(--button-bg);
  color: var(--button-text);
  padding: 10px 12px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.upload-box {
  position: relative;
  border: 1.5px dashed color-mix(in srgb, var(--primary) 42%, transparent);
  border-radius: 20px;
  background: color-mix(in srgb, var(--button-bg) 62%, transparent);
  padding: 24px;
  text-align: center;
  cursor: pointer;
  transition: all 0.25s ease;
}

.upload-box.dragover,
.upload-box:hover {
  border-color: color-mix(in srgb, var(--accent) 56%, transparent);
  background: color-mix(in srgb, var(--accent) 8%, transparent);
}

.upload-box strong {
  display: block;
  margin-bottom: 6px;
}

.preview-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-top: 18px;
}

.preview-card {
  width: 84px;
  height: 84px;
  border-radius: 18px;
  overflow: hidden;
  position: relative;
}

.preview-card img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.preview-remove {
  position: absolute;
  top: 6px;
  right: 6px;
  width: 24px;
  height: 24px;
  border: none;
  border-radius: 50%;
  background: rgba(28, 18, 12, 0.74);
  color: #fff;
  cursor: pointer;
}

.theme-card {
  border: 1px solid var(--panel-border);
  border-radius: 20px;
  background: color-mix(in srgb, var(--button-bg) 82%, transparent);
  padding: 14px;
  cursor: pointer;
  color: var(--text-main);
  text-align: left;
  transition: transform 0.22s ease, border-color 0.22s ease, background 0.22s ease;
}

.theme-card.active {
  border-color: color-mix(in srgb, var(--accent) 42%, transparent);
  background: var(--accent-soft);
}

.theme-card small {
  display: block;
  margin-top: 4px;
  color: var(--text-muted);
  line-height: 1.5;
}

.theme-preview {
  height: 70px;
  border-radius: 16px;
  margin-bottom: 10px;
  background: var(--preview-bg);
  position: relative;
  overflow: hidden;
}

.theme-preview::before {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(135deg, var(--preview-primary), transparent 55%);
  opacity: 0.48;
}

.theme-preview-dot {
  position: absolute;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: var(--preview-accent);
  right: 18px;
  bottom: 18px;
  box-shadow: 0 0 20px var(--preview-accent);
}

.auth-error {
  color: #b83b2f;
  text-align: center;
  margin: 12px 0 0;
  font-size: 0.9rem;
}

.modal-card .modal-actions,
.auth-panel .modal-actions {
  margin-top: 20px;
  justify-content: center;
}

.fullscreen-viewer {
  position: fixed;
  inset: 0;
  z-index: 500;
  background: rgba(0, 0, 0, 0.86);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  cursor: pointer;
}

.fullscreen-image {
  max-width: 92%;
  max-height: 92%;
  border-radius: 16px;
}

/* 非遮挡式状态条 */
.status-bar {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 10px 16px;
  background: linear-gradient(180deg, rgba(139, 89, 54, 0.12), transparent);
  font-size: 13px;
  color: var(--text-main);
}

.status-spinner {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  border: 2px solid rgba(187, 77, 51, 0.2);
  border-top-color: var(--accent);
  animation: spin 0.8s linear infinite;
}

.status-slide-enter-active,
.status-slide-leave-active {
  transition: all 0.25s ease;
}

.status-slide-enter-from,
.status-slide-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}

.tooltip-fade-enter-active,
.tooltip-fade-leave-active,
.overlay-fade-enter-active,
.overlay-fade-leave-active,
.map-wash-enter-active,
.map-wash-leave-active {
  transition: opacity 0.25s ease;
}

.tooltip-fade-enter-from,
.tooltip-fade-leave-to,
.overlay-fade-enter-from,
.overlay-fade-leave-to,
.map-wash-enter-from,
.map-wash-leave-to {
  opacity: 0;
}

.animate-scale-in {
  animation: scaleIn 0.28s ease forwards;
}

@keyframes float {
  0%, 100% {
    transform: translate3d(0, 0, 0) scale(1);
  }
  50% {
    transform: translate3d(18px, -28px, 0) scale(1.04);
  }
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

@keyframes scaleIn {
  from {
    opacity: 0;
    transform: scale(0.96);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    scroll-behavior: auto !important;
    transition-duration: 0.01ms !important;
  }
}

@media (min-width: 1440px) {
  .workspace {
    grid-template-columns: minmax(290px, 360px) minmax(560px, 1fr) minmax(300px, 380px);
  }
}

@media (max-width: 1320px) {
  .app-shell {
    padding: 18px;
  }

  .workspace {
    grid-template-columns: minmax(240px, 300px) minmax(500px, 1fr) minmax(240px, 320px);
    gap: 18px;
  }

  .workspace.empty-footprints {
    grid-template-columns: minmax(0, 1fr);
  }

  .sidebar,
  .detail-panel {
    padding: 20px;
  }
}

@media (max-width: 1180px) {
  .app-shell {
    overflow-x: hidden;
    overflow-y: auto;
  }

  .workspace {
    grid-template-columns: minmax(280px, 360px) minmax(0, 1fr);
    height: auto;
    min-height: calc(100dvh - 136px);
  }

  .workspace.empty-footprints {
    grid-template-columns: 1fr;
  }

  .map-stage {
    min-height: min(720px, calc(100dvh - 160px));
  }

  .detail-panel {
    grid-column: 1 / -1;
  }

  .map-stage-body {
    min-height: clamp(430px, calc(100dvh - 280px), 620px);
  }
}

@media (max-width: 900px) {
  .app-shell {
    padding: 16px;
    padding-bottom: 16px;
  }

  .workspace {
    grid-template-columns: 1fr;
    height: auto;
  }

  .workspace .sidebar,
  .workspace .map-stage,
  .workspace .detail-panel {
    width: 100%;
    height: auto;
  }

  .topbar {
    padding: 14px 18px;
  }

  .brand-block h1 {
    font-size: 1.4rem;
  }

  .brand-block p {
    display: none;
  }

  .narrative-card {
    display: none;
  }

  .map-stage {
    min-height: min(600px, calc(100dvh - 140px));
  }

  .map-stage-body {
    min-height: clamp(380px, calc(100dvh - 240px), 560px);
  }

  .topbar-actions,
  .map-stage-actions {
    flex-wrap: wrap;
    gap: 8px;
  }

  .ghost-btn,
  .primary-btn {
    padding: 8px 12px;
    font-size: 0.85rem;
  }
}

@media (max-width: 768px) {
  .app-shell {
    padding: 12px;
    padding-bottom: calc(92px + env(safe-area-inset-bottom));
  }

  .focus-toggle-btn {
    display: none;
  }

  .topbar {
    top: 8px;
    gap: 12px;
    padding: 12px;
    border-radius: 24px;
  }

  .brand-line {
    gap: 8px;
  }

  .brand-block h1 {
    font-size: clamp(1.45rem, 8vw, 2rem);
  }

  .brand-block p,
  .breadcrumb-bar {
    display: none;
  }

  .system-notice {
    width: 100%;
    border-radius: 20px;
    align-items: flex-start;
  }

  .toast-container {
    right: 12px;
    bottom: calc(86px + env(safe-area-inset-bottom));
    max-width: calc(100vw - 24px);
  }

  .mobile-hidden {
    display: none !important;
  }

  .map-stage {
    min-height: calc(100dvh - 168px);
    padding: 10px;
  }

  .map-stage-body {
    min-height: clamp(430px, calc(100dvh - 300px), 620px);
    border-radius: 22px;
  }

  .topbar,
  .map-stage-header {
    flex-direction: column;
    align-items: flex-start;
  }

  .topbar-actions,
  .map-stage-actions,
  .modal-actions,
  .detail-actions,
  .form-intro-grid,
  .form-grid,
  .theme-grid,
  .stat-grid {
    width: 100%;
    grid-template-columns: 1fr;
    flex-wrap: wrap;
  }

  .topbar-actions,
  .map-stage-actions {
    justify-content: flex-start;
  }

  .stage-mode-group,
  .map-zoom-cluster {
    flex: 1 1 auto;
  }

  .map-zoom-cluster {
    justify-content: space-between;
  }

  .search-controls,
  .ai-search-box,
  .region-metrics,
  .photo-tools {
    grid-template-columns: 1fr;
  }

  .map-overlay-card {
    position: absolute;
    left: 8px;
    top: 8px;
    right: auto;
    margin: 0;
    max-width: min(218px, calc(100% - 16px));
    padding: 8px 10px;
    border-radius: 16px;
  }

  .map-overlay-card:not(.collapsed) {
    max-height: 126px;
    overflow: auto;
  }

  .map-overlay-card.collapsed h3 {
    display: none;
  }

  .map-overlay-head {
    margin-bottom: 0;
  }

  .map-overlay-card h3 {
    margin-top: 6px;
    font-size: 0.95rem;
  }

  .map-overlay-card p {
    display: none;
  }

  .floating-badge {
    padding: 4px 8px;
    font-size: 0.72rem;
  }

  .overlay-toggle {
    padding: 4px 8px;
    font-size: 0.7rem;
  }

  .context-pills {
    display: none;
  }

  .legend-card {
    right: 10px;
    bottom: 88px;
    min-width: 0;
    max-width: 128px;
    padding: 8px 9px;
    border-radius: 14px;
    font-size: 0.72rem;
  }

  .legend-title {
    font-size: 0.74rem;
  }

  .legend-row {
    gap: 7px;
    margin-top: 5px;
  }

  .legend-dot {
    width: 8px;
    height: 8px;
    box-shadow: 0 0 0 4px var(--map-skin-glow);
  }

  .legend-dot.strong {
    width: 10px;
    height: 10px;
    box-shadow: 0 0 0 4px color-mix(in srgb, var(--accent) 18%, transparent);
  }

  .legend-line {
    width: 20px;
  }

  .timeline-board {
    inset: 12px;
    padding: 16px;
  }

  .timeline-year-group {
    grid-template-columns: 1fr;
    gap: 10px;
  }

  .timeline-year {
    position: static;
    width: fit-content;
  }
}

@media (max-width: 520px) {
  .app-shell {
    padding: 12px;
    padding-bottom: 112px;
  }

  .topbar,
  .sidebar,
  .map-stage,
  .detail-panel {
    border-radius: 24px;
  }

  .topbar {
    padding: 16px;
  }

  .topbar.mobile-compact .brand-block p {
    display: none;
  }

  .topbar.mobile-compact .breadcrumb-bar {
    margin-top: 8px;
  }

  .map-stage {
    padding: 14px;
    min-height: calc(100dvh - 128px);
  }

  .map-stage-body {
    min-height: clamp(400px, calc(100dvh - 274px), 520px);
    border-radius: 20px;
  }

  .ghost-btn,
  .primary-btn,
  .danger-btn {
    padding: 10px 14px;
  }

  .hero-photo {
    min-height: 180px;
  }

  .timeline-board-header p {
    display: none;
  }

  .empty-guide-card {
    max-width: calc(100vw - 32px);
    padding: 24px;
    margin-top: 0;
  }

  .guide-steps {
    flex-direction: column;
    gap: 12px;
  }

  .guide-step {
    flex-direction: row;
    justify-content: flex-start;
    text-align: left;
  }

  .mobile-hidden {
    display: none !important;
  }
}

/* 手机端底部导航 */
.mobile-nav {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 200;
  display: flex;
  justify-content: space-around;
  padding: 8px 10px calc(8px + env(safe-area-inset-bottom));
  background:
    linear-gradient(135deg, rgba(255, 255, 255, 0.18), rgba(255, 255, 255, 0.06)),
    color-mix(in srgb, var(--panel-strong-bg) 88%, transparent);
  border-top: 1px solid var(--panel-border);
  backdrop-filter: blur(18px) saturate(1.12);
  -webkit-backdrop-filter: blur(18px) saturate(1.12);
}

.nav-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 8px 16px;
  border: none;
  border-radius: 12px;
  background: transparent;
  color: var(--text-muted);
  cursor: pointer;
  transition: all 0.2s ease;
}

.nav-item:hover,
.nav-item.active {
  background: var(--accent-soft);
  color: var(--accent);
}

.nav-item:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.nav-icon {
  font-size: 1.5rem;
}

.nav-label {
  font-size: 0.75rem;
}

/* 手机模式下的 workspace */
.workspace.mobile-mode {
  grid-template-columns: 1fr;
  height: auto;
  min-height: calc(100vh - 140px);
  min-height: calc(100dvh - 140px);
  padding-bottom: 24px;
}

.workspace.mobile-mode .sidebar,
.workspace.mobile-mode .map-stage,
.workspace.mobile-mode .detail-panel {
  height: auto;
  min-height: 0;
  width: 100%;
}

.workspace.mobile-mode .sidebar {
  min-height: 280px;
}

.workspace.mobile-mode .map-stage {
  min-height: min(420px, calc(100dvh - 180px));
}

.workspace.mobile-mode .map-stage-body {
  min-height: clamp(320px, calc(100dvh - 280px), 480px);
}

.workspace.mobile-mode .detail-panel {
  min-height: 200px;
}

@media (max-width: 768px) {
  .workspace.mobile-mode {
    min-height: calc(100dvh - 132px);
    padding-bottom: 8px;
  }

  .workspace.mobile-mode .map-stage {
    min-height: calc(100dvh - 166px);
    padding: 10px;
  }

  .workspace.mobile-mode .map-stage-body {
    min-height: clamp(430px, calc(100dvh - 300px), 620px);
  }

  .workspace.mobile-mode .sidebar,
  .workspace.mobile-mode .detail-panel {
    border-radius: 24px;
  }

  .mobile-nav {
    left: 10px;
    right: 10px;
    bottom: 10px;
    border: 1px solid var(--panel-border);
    border-radius: 24px;
    box-shadow: 0 18px 50px color-mix(in srgb, var(--dark) 24%, transparent);
  }

  .nav-item {
    flex: 1 1 0;
    padding: 8px 6px;
  }
}

/* 旅程时间线卡片 */
.journey-timeline-card {
  padding: 18px;
  border-radius: 24px;
  background: color-mix(in srgb, var(--panel-soft-bg) 78%, transparent);
  border: 1px solid var(--panel-border);
}

.journey-filter {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 14px;
}

.small-chip {
  padding: 6px 10px;
  font-size: 0.85rem;
}

.journey-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-bottom: 14px;
}

.journey-item {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  padding: 12px 14px;
  border: 1px solid var(--panel-border);
  border-radius: 16px;
  background: color-mix(in srgb, var(--button-bg) 88%, transparent);
  cursor: pointer;
  transition: all 0.2s ease;
  font: inherit;
  text-align: left;
}

.journey-item:hover {
  transform: translateY(-2px);
  border-color: color-mix(in srgb, var(--accent) 26%, transparent);
  background-color: color-mix(in srgb, var(--panel-soft-bg) 92%, white);
}

.journey-item.active {
  background: var(--accent-soft);
  border-color: color-mix(in srgb, var(--accent) 34%, transparent);
}

.journey-transport {
  font-size: 1.5rem;
}

.journey-info strong {
  display: block;
  margin-bottom: 2px;
  font-size: 0.95rem;
}

.journey-info small {
  color: var(--text-muted);
}

.journey-info p {
  margin: 4px 0 0;
  color: var(--text-muted);
  font-size: 0.82rem;
}

/* 添加旅程弹窗 */
.journey-route-display {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16px;
  padding: 20px;
  margin-bottom: 18px;
  border-radius: 20px;
  background: color-mix(in srgb, var(--button-bg) 88%, transparent);
  border: 1px solid var(--panel-border);
}

.route-point {
  text-align: center;
}

.point-label {
  display: block;
  margin-bottom: 4px;
  color: rgba(157, 106, 47, 0.9);
  font-size: 0.78rem;
}

.route-point strong {
  display: block;
  font-family: 'Noto Serif SC', serif;
}

.route-arrow {
  font-size: 1.8rem;
  color: rgba(187, 77, 51, 0.8);
}

.transport-selector {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 10px;
}

.transport-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 12px 8px;
  border: 1px solid rgba(139, 115, 85, 0.12);
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.72);
  cursor: pointer;
  transition: all 0.2s ease;
  font: inherit;
}

.transport-btn:hover {
  transform: translateY(-2px);
  border-color: rgba(187, 77, 51, 0.2);
}

.transport-btn.active {
  background: rgba(187, 77, 51, 0.12);
  border-color: rgba(187, 77, 51, 0.24);
}

.transport-btn {
  font-size: 1.5rem;
}

.transport-btn small {
  font-size: 0.78rem;
  color: rgba(36, 26, 19, 0.7);
}

/* 旅程详情卡片 */
.journey-detail-card {
  width: min(520px, 100%);
  padding: 24px;
  border-radius: 28px;
}

.journey-detail-header {
  text-align: center;
  margin-bottom: 20px;
}

.journey-icon-large {
  display: inline-block;
  font-size: 3rem;
  margin-bottom: 12px;
}

.journey-detail-header h3 {
  margin: 0;
  font-family: 'Noto Serif SC', serif;
  font-size: 1.6rem;
}

.journey-detail-header p {
  margin: 6px 0 0;
  color: rgba(157, 106, 47, 0.9);
}

.journey-detail-body {
  margin-bottom: 20px;
}

.journey-meta {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
  margin-bottom: 14px;
}

.meta-item {
  padding: 12px 14px;
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.56);
  border: 1px solid rgba(139, 115, 85, 0.1);
}

.meta-label {
  display: block;
  margin-bottom: 4px;
  color: rgba(36, 26, 19, 0.6);
  font-size: 0.82rem;
}

.meta-item strong {
  display: block;
  font-family: 'Noto Serif SC', serif;
}

.journey-flight-info,
.journey-notes {
  padding: 14px;
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.56);
  border: 1px solid rgba(139, 115, 85, 0.1);
  margin-bottom: 12px;
}

.journey-notes p {
  margin: 8px 0 0;
  color: rgba(36, 26, 19, 0.8);
  line-height: 1.6;
}

.journey-detail-actions {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.journey-detail-actions .danger-btn {
  width: auto;
}

@media (min-width: 769px) {
  .workspace {
    display: block;
    height: calc(100vh - 118px);
    height: calc(100dvh - 118px);
    min-height: 680px;
    grid-template-columns: none;
  }

  .workspace.mobile-mode {
    display: grid;
    height: auto;
    min-height: calc(100vh - 140px);
  }

  .sidebar,
  .detail-panel {
    position: absolute;
    top: 28px;
    bottom: 28px;
    height: auto;
  }

  .sidebar {
    left: 28px;
    width: min(360px, 29vw);
  }

  .detail-panel {
    right: 28px;
    width: min(360px, 29vw);
  }

  .workspace.mobile-mode .map-stage {
    position: relative;
    inset: auto;
    min-height: min(420px, calc(100dvh - 180px));
    padding: 14px;
  }

  .workspace.mobile-mode .map-stage-header,
  .workspace.mobile-mode .sidebar,
  .workspace.mobile-mode .detail-panel {
    position: relative;
    inset: auto;
    width: 100%;
    transform: none;
  }
}

@media (min-width: 769px) and (max-width: 1100px) {
  .workspace {
    min-height: 660px;
  }

  .map-stage-header {
    left: 24px;
    top: 24px;
    width: min(360px, calc(100% - 380px));
    min-width: 300px;
    transform: none;
    flex-direction: column;
    align-items: flex-start;
  }

  .map-stage-actions {
    width: 100%;
    justify-content: flex-start;
  }

  .stage-mode-group,
  .map-zoom-cluster {
    flex: 1 1 auto;
  }

  .map-stage-header {
    gap: 10px;
    padding: 0;
    margin-bottom: 8px;
  }

  .map-stage-header h2 {
    font-size: clamp(1.35rem, 6vw, 1.75rem);
  }

  .stage-subcopy {
    font-size: 0.9rem;
    line-height: 1.45;
  }

  .sidebar {
    opacity: 0;
    pointer-events: none;
    transform: translateX(-18px) scale(0.96);
  }

  .detail-panel {
    top: 28px;
    right: 28px;
    bottom: 28px;
    width: 316px;
    transform: none;
  }

  .workspace.empty-footprints .detail-panel {
    width: 316px;
  }
}
</style>
