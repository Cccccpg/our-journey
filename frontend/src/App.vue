<template>
  <div class="app-shell" :style="appStyle">
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
      <button class="nav-item" :class="{ active: mobileView === 'detail' }" @click="mobileView = 'detail'" :disabled="!selectedFootprint && !selectedCluster">
        <span class="nav-icon">📄</span>
        <span class="nav-label">详情</span>
      </button>
      <button class="nav-item" :class="{ active: mobileView === 'stats' }" @click="mobileView = 'stats'">
        <span class="nav-icon">📊</span>
        <span class="nav-label">统计</span>
      </button>
    </nav>

    <header class="topbar panel panel-soft" :class="{ 'mobile-compact': isMobile }">
      <div class="brand-block">
        <span class="eyebrow">Journey Archive</span>
        <div class="brand-line">
          <h1>{{ currentViewName }}</h1>
          <span class="status-pill">{{ currentViewBadge }}</span>
        </div>
        <p>{{ currentViewDescription }}</p>
        <div class="breadcrumb-bar" v-if="breadcrumbTrail.length">
          <button
            v-for="crumb in breadcrumbTrail"
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
        <button v-if="currentCityArea" class="ghost-btn" @click="backToProvince">返回城市</button>
        <button v-if="currentProvince" class="ghost-btn" @click="backToChina">返回世界</button>
        <button class="ghost-btn" @click="showThemePanel = true">切换风格</button>
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
          :disabled="!editMode.isAuthenticated || !currentProvince"
          @click="openQuickAdd"
        >
          添加足迹
        </button>
      </div>
    </header>

    <main class="workspace" :class="{ 'mobile-mode': isMobile, 'empty-footprints': placesStore.cities.length === 0 }">
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
        <section class="narrative-card">
          <span class="eyebrow">Shared Miles</span>
          <h2>把一起走过的路，收进同一张地图</h2>
          <p>
            每一个省份、城市和区县，都不是冰冷的坐标。它们是某次出发、某顿晚餐、
            某张照片和某个忽然想起的傍晚。
          </p>
        </section>

        <section class="stat-grid">
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

        <section class="region-card">
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

        <section class="filter-card">
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

        <section class="timeline-card">
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
        <section class="journey-timeline-card">
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
            <button class="ghost-btn" :class="{ 'active-badge': viewMode === 'map' }" @click="viewMode = 'map'">地图</button>
            <button class="ghost-btn" :class="{ 'active-badge': viewMode === 'timeline' }" @click="viewMode = 'timeline'">时间轴</button>
            <button class="ghost-btn" @click="zoomOut">缩小</button>
            <button class="ghost-btn" @click="resetView">重置</button>
            <button class="ghost-btn" @click="zoomIn">放大</button>
          </div>
        </div>

        <div
          ref="mapStageBodyRef"
          class="map-stage-body"
          :class="[`skin-${activeMapSkin}`, { transitioning: mapTransitioning, 'timeline-mode': viewMode === 'timeline' }]"
          :style="mapStageStyle"
        >
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

          <div v-if="viewMode === 'map'" class="legend-card panel panel-soft">
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
              <span>旅行动线</span>
            </div>
          </div>

          <div v-if="viewMode === 'timeline'" class="timeline-board">
            <div class="timeline-board-header">
              <span class="eyebrow">Chronicle View</span>
              <h3>按时间重看这片区域</h3>
              <p>时间轴会跟随当前地图层级、关键词和年份筛选变化，适合从故事脉络回到地图点位。</p>
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

      <aside class="detail-panel panel panel-strong" :class="{ 'mobile-hidden': isMobile && mobileView !== 'detail' }">
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
              编辑这段回忆
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
          </div>
        </template>

        <section class="memory-list-card">
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
            </div>
          </div>

          <div class="form-grid">
            <label class="field-block">
              <span>城市</span>
              <input
                v-if="formData.city_name"
                v-model="formData.city_name"
                class="field-control"
                readonly
              />
              <select v-else v-model="formData.city_name" class="field-control">
                <option value="">选择城市</option>
                <option v-for="city in availableCities" :key="city.value" :value="city.value">{{ city.label }}</option>
              </select>
            </label>

            <label v-if="currentCityArea" class="field-block">
              <span>区县</span>
              <input
                v-if="formData.district_name"
                v-model="formData.district_name"
                class="field-control"
                readonly
              />
              <select v-else v-model="formData.district_name" class="field-control">
                <option value="">选择区县</option>
                <option v-for="district in availableDistricts" :key="district.value" :value="district.value">{{ district.label }}</option>
              </select>
            </label>

            <label class="field-block">
              <span>访问日期</span>
              <input v-model="formData.visited_at" class="field-control" type="date" />
            </label>

            <label class="field-block full-span">
              <span>回忆描述</span>
              <textarea
                v-model="formData.description"
                class="field-control textarea"
                rows="4"
                placeholder="写下这趟旅程最值得记住的画面"
              ></textarea>
            </label>

            <label class="field-block full-span">
              <span>标签</span>
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
                @click="triggerAddUpload"
                @dragover.prevent="isDragover = true"
                @dragleave="isDragover = false"
                @drop.prevent="onDrop"
              >
                <input
                  ref="addUploadInput"
                  hidden
                  type="file"
                  multiple
                  accept="image/*"
                  @change="handleUpload"
                />
                <strong>点击或拖拽照片到这里</strong>
                <p>支持一次补充多张旅行照片</p>
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
              <span>回忆描述</span>
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
                @click="triggerEditUpload"
                @dragover.prevent="isDragover = true"
                @dragleave="isDragover = false"
                @drop.prevent="onDrop"
              >
                <input
                  ref="editUploadInput"
                  hidden
                  type="file"
                  multiple
                  accept="image/*"
                  @change="handleUpload"
                />
                <strong>点击或拖拽照片到这里</strong>
                <p>新增照片会自动追加到这条足迹</p>
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

          <div class="modal-actions">
            <button class="primary-btn" @click="showThemePanel = false">完成</button>
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
              <span>旅途备注</span>
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

    <transition name="overlay-fade">
      <div v-if="isLoading" class="loading-overlay">
        <div class="loading-card panel panel-soft animate-scale-in">
          <div class="spinner"></div>
          <p>{{ loadingText }}</p>
        </div>
      </div>
    </transition>

    <!-- Toast 提示 -->
    <transition name="toast-slide">
      <div v-if="toastMessage" class="toast-container" :class="toastType">
        <span class="toast-icon">{{ toastType === 'success' ? '✓' : toastType === 'error' ? '✗' : 'ℹ' }}</span>
        <span class="toast-message">{{ toastMessage }}</span>
      </div>
    </transition>
  </div>
</template>

<script setup>
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { deletePhoto, setCoverPhoto, updatePhotoOrder, uploadPhotos } from './api'
import { useEditStore } from './stores/edit'
import { usePlacesStore } from './stores/places'

const placesStore = usePlacesStore()
const editMode = useEditStore()

const mapRef = ref(null)
const mapStageBodyRef = ref(null)
const addUploadInput = ref(null)
const editUploadInput = ref(null)
let mapInstance = null
let maplibreGlModule = null
let provinceLabelMarkers = []

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
let toastTimer = null

function showToast(message, type = 'success', duration = 3000) {
  toastMessage.value = message
  toastType.value = type
  if (toastTimer) clearTimeout(toastTimer)
  toastTimer = setTimeout(() => {
    toastMessage.value = ''
  }, duration)
}
const editingFootprint = ref(null)
const activeFilter = ref('all')
const activeYear = ref('all')
const searchQuery = ref('')
const selectedCluster = ref(null)
const mapTransitioning = ref(false)
const transitionText = ref('正在切换地图层级...')
const viewMode = ref('map')
const activeMapSkin = ref(localStorage.getItem('mapSkin') || 'warm')
const emptyGuideDismissed = ref(localStorage.getItem('emptyGuideDismissed') !== '0')
const mapOverlayCollapsed = ref(true)

// 手机端适配
const MOBILE_BREAKPOINT = 768
const isMobile = ref(window.innerWidth < MOBILE_BREAKPOINT)
const mobileView = ref('map')
const checkMobile = () => {
  isMobile.value = window.innerWidth < MOBILE_BREAKPOINT
}
const mobileResizeHandler = () => {
  checkMobile()
  requestMapResize()
}

const currentProvince = ref(null)
const currentCityArea = ref(null)
const provinceGeoCache = ref({})
const districtGeoCache = ref({})
const chinaGeoCache = ref(null)
const hoverLabel = ref(null)
const tooltipPosition = ref({ x: 0, y: 0 })
let mapResizeObserver = null
let mapResizeTimer = null

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
  return city.district_name ? `${city.name} · ${city.district_name}` : city.name
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

const mapStageTitle = computed(() => {
  if (currentCityArea.value) return `${currentCityArea.value.name} · 细碎日光`
  if (currentProvince.value) return `${currentProvince.value.name} · 城市片段`
  return '世界足迹星球'
})

const currentActionHint = computed(() => {
  if (currentCityArea.value) {
    return editMode.isAuthenticated
      ? '点一个区县，把那天的照片、天气和心情放回原来的地方。'
      : '这里适合重看一座城市里的小地方，那些不像景点、却很像你们的瞬间。'
  }
  if (currentProvince.value) {
    return '点开一座城市，看看这趟旅程在更细的地方留下了什么。'
  }
  return '拖动旋转地球，滚轮自由缩放；足迹、照片和旅行动线会沿着经纬度浮在星球表面。'
})

const currentLayerMetric = computed(() => {
  if (currentCityArea.value) return `${availableDistricts.value.length || 0} 个区县单元`
  if (currentProvince.value) return `${availableCities.value.length || 0} 个城市单元`
  return `${filteredCities.value.length || placesStore.cities.length || 0} 个世界坐标`
})

const currentActionShort = computed(() => {
  if (currentCityArea.value) return '把回忆放进角落'
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
  if (currentCityArea.value) return '等一段具体的小回忆'
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
  return '可以从一个省份开始，也可以等下一次旅行回来，再把新的章节补上。'
})

const collectionTip = computed(() => {
  if (currentCityArea.value) {
    return '这里收着这座城市里更小的停留，适合慢慢对照每一段发生的位置。'
  }
  if (currentProvince.value) {
    return '这一省里的记录都会在这里汇合，像一本按城市分好的旅行手账。'
  }
  return '所有旧日子都按地点收好，想念哪一段，就从这里跳回去。'
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

  if (query) {
    source = source.filter((city) => {
      const fields = [
        city.name,
        city.district_name,
        city.province_name,
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
  if (currentCityArea.value) {
    return `${currentCityArea.value.name} · ${formData.value.district_name || '请选择或点击区县'}`
  }
  if (!currentProvince.value) return '先进入某个省份，再选择城市。'
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
  return '进入省份后开始记录'
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

function triggerAddUpload() {
  addUploadInput.value?.click()
}

function triggerEditUpload() {
  editUploadInput.value?.click()
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
  if (!editMode.isAuthenticated || !currentProvince.value) return
  formData.value.province_id = currentProvince.value.id
  formData.value.province_name = currentProvince.value.name
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
  mapInstance.flyTo({ center: [104, 36], zoom: 2, duration: 1500 })
}

function getDefaultMapZoom() {
  if (currentCityArea.value) return 12
  if (currentProvince.value) return 7
  return 3
}

function getMinMapZoom() {
  if (currentCityArea.value) return 10
  if (currentProvince.value) return 5
  return 1
}

function getCurrentMapZoom() {
  return mapInstance?.getZoom() || getDefaultMapZoom()
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

function handleMapWheel(event) {
  if (viewMode.value !== 'map' || !mapInstance) return
  event.preventDefault()
  event.stopPropagation()
  const currentZoom = mapInstance.getZoom()
  const ratio = event.deltaY < 0 ? 1.15 : 1 / 1.15
  mapInstance.setZoom(clampMapZoom(currentZoom * ratio))
  globeAutoRotate = false
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

  mapInstance.flyTo({ center: [104, 36], zoom: 3, duration: 800 })
}

async function loadProvinceMap(province) {
  if (!province?.adcode || !mapInstance) return
  isLoading.value = true
  loadingText.value = `进入 ${province.name}...`
  mapTransitioning.value = true
  transitionText.value = `进入 ${province.name}`
  globeAutoRotate = false

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
  transitionText.value = '返回世界'
  currentProvince.value = null
  currentCityArea.value = null
  activeFilter.value = 'all'
  closeFootprintPanel()

  // 移除省级和区县级边界图层
  removeBoundaryLayers()
  globeAutoRotate = true

  // 飞回全球视角
  mapInstance.flyTo({
    center: [104, 36],
    zoom: 3,
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
  transitionText.value = `返回 ${currentProvince.value?.name || '省份'}`
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
  flight: { color: '#4A90D9', curveness: 0.5, symbol: 'plane', width: 2 },
  train: { color: '#4A9B7C', curveness: 0, symbol: 'train', width: 2, type: 'dashed' },
  car: { color: '#F6AD55', curveness: 0.2, symbol: 'car', width: 2.5 },
  ship: { color: '#2C5F4D', curveness: 0.35, symbol: 'ship', width: 2 },
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

function getTileSource(skinId) {
  // 根据主题选择不同的瓦片源
  switch (skinId) {
    case 'night':
      return {
        type: 'raster',
        tiles: ['https://basemaps.cartocdn.com/rastertiles/dark_all/{z}/{x}/{y}.png'],
        tileSize: 256,
      }
    case 'warm':
      return {
        type: 'raster',
        tiles: ['https://basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png'],
        tileSize: 256,
      }
    case 'vintage':
      return {
        type: 'raster',
        tiles: ['https://basemaps.cartocdn.com/rastertiles/light_nolabels/{z}/{x}/{y}.png'],
        tileSize: 256,
      }
    case 'aero':
      return {
        type: 'raster',
        tiles: ['https://basemaps.cartocdn.com/rastertiles/light_all/{z}/{x}/{y}.png'],
        tileSize: 256,
      }
    default:
      return {
        type: 'raster',
        tiles: ['https://basemaps.cartocdn.com/rastertiles/light_all/{z}/{x}/{y}.png'],
        tileSize: 256,
      }
  }
}

function getOSMLayerPaint(skinId) {
  // 根据主题调整瓦片显示效果
  switch (skinId) {
    case 'night':
      // 星图主题：深邃夜空效果
      return {
        'raster-saturation': -0.2,
        'raster-brightness-min': 0.12,
        'raster-brightness-max': 0.55,
        'raster-opacity': 0.7,
      }
    case 'warm':
      // 暖砂主题：傍晚暖色调
      return {
        'raster-saturation': 0.15,
        'raster-brightness-min': 0.12,
        'raster-brightness-max': 0.92,
        'raster-opacity': 0.8,
        'raster-hue-rotate': 25, // 橙暖色调偏移
      }
    case 'vintage':
      // 复古主题：旧纸质地图效果（叠加棕色滤镜）
      return {
        'raster-saturation': -0.4,
        'raster-brightness-min': 0.22,
        'raster-brightness-max': 0.8,
        'raster-opacity': 0.75,
        'raster-hue-rotate': 35, // 棕褐色调
      }
    case 'aero':
      // 航线主题：清晰明亮
      return {
        'raster-saturation': -0.08,
        'raster-brightness-min': 0.08,
        'raster-brightness-max': 0.95,
        'raster-opacity': 0.82,
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
      'osm-tiles': getTileSource(activeMapSkin.value),
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
      // 基础底图
      {
        id: 'background',
        type: 'background',
        paint: { 'background-color': skin.sea || '#f5f5f5' },
      },
      {
        id: 'osm-layer',
        type: 'raster',
        source: 'osm-tiles',
        paint: getOSMLayerPaint(activeMapSkin.value),
      },
      // 全国省份边界填充（globe视图下显示）
      {
        id: 'china-fill',
        type: 'fill',
        source: 'china-boundary',
        paint: {
          'fill-color': skin.landAlt || skin.land,
          'fill-opacity': (!currentProvince.value && !currentCityArea.value) ? 0.35 : 0,
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
        filter: ['==', ['get', 'transport'], 'flight'],
        paint: {
          'line-color': routeColors.flight,
          'line-width': 2.5,
          'line-opacity': 0.85,
        },
      },
      // 旅程路线 - 火车
      {
        id: 'journey-train',
        type: 'line',
        source: 'journeys',
        filter: ['==', ['get', 'transport'], 'train'],
        paint: {
          'line-color': routeColors.train,
          'line-width': 2,
          'line-dasharray': [2, 2],
          'line-opacity': 0.75,
        },
      },
      // 旅程路线 - 汽车
      {
        id: 'journey-car',
        type: 'line',
        source: 'journeys',
        filter: ['==', ['get', 'transport'], 'car'],
        paint: {
          'line-color': routeColors.car,
          'line-width': 2.5,
          'line-opacity': 0.7,
        },
      },
      // 旅程路线 - 轮船
      {
        id: 'journey-ship',
        type: 'line',
        source: 'journeys',
        filter: ['==', ['get', 'transport'], 'ship'],
        paint: {
          'line-color': routeColors.ship,
          'line-width': 2,
          'line-opacity': 0.75,
        },
      },
      // 足迹连接线
      {
        id: 'footprint-lines',
        type: 'line',
        source: 'footprints',
        filter: ['==', ['get', 'type'], 'line'],
        paint: {
          'line-color': skin.line,
          'line-width': 1.5,
          'line-opacity': 0.56,
        },
      },
      // 足迹标记点
      {
        id: 'footprint-points',
        type: 'circle',
        source: 'footprints',
        filter: ['==', ['get', 'type'], 'point'],
        paint: {
          'circle-radius': ['interpolate', ['linear'], ['zoom'], 3, 8, 10, 16],
          'circle-color': skin.point,
          'circle-stroke-color': activeMapSkin.value === 'night' ? 'rgba(255,235,195,0.86)' : 'rgba(255,255,255,0.84)',
          'circle-stroke-width': 2,
          'circle-opacity': 0.95,
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
    glyphs: 'https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf',
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

  // 添加连接线（按时间顺序）
  const sorted = filteredCities.value
    .filter((city) => city.longitude && city.latitude)
    .sort((a, b) => new Date(a.visited_at || 0) - new Date(b.visited_at || 0))

  for (let i = 1; i < sorted.length; i++) {
    features.push({
      type: 'Feature',
      geometry: {
        type: 'LineString',
        coordinates: [
          [sorted[i - 1].longitude, sorted[i - 1].latitude],
          [sorted[i].longitude, sorted[i].latitude],
        ],
      },
      properties: { type: 'line' },
    })
  }

  return { type: 'FeatureCollection', features }
}

function buildJourneyGeoJSON() {
  const features = []

  (placesStore.journeys || []).forEach((journey) => {
    if (!journey.from_lon || !journey.from_lat || !journey.to_lon || !journey.to_lat) return

    // 创建大圆弧线（近似）
    const from = [journey.from_lon, journey.from_lat]
    const to = [journey.to_lon, journey.to_lat]
    const midLon = (from[0] + to[0]) / 2
    const midLat = (from[1] + to[1]) / 2
    const distance = Math.hypot(to[0] - from[0], to[1] - from[1])
    const arcHeight = distance * 0.15

    features.push({
      type: 'Feature',
      geometry: {
        type: 'LineString',
        coordinates: [from, [midLon, midLat + arcHeight], to],
      },
      properties: {
        transport: journey.transport_type,
        id: journey.id,
        from_city: journey.from_city_name,
        to_city: journey.to_city_name,
      },
    })
  })

  return { type: 'FeatureCollection', features }
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
  if (!mapInstance || !maplibreGlModule) return

  const source = mapInstance.getSource('china-boundary')
  if (source) {
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

    // 使用 Marker 显示省份中文名称（绕过 glyphs 问题）
    clearProvinceLabelMarkers()
    const skin = activeMapSkinConfig.value
    const showLabels = !currentProvince.value && !currentCityArea.value

    if (showLabels) {
      enhancedGeojson.features.forEach(f => {
        const name = f.properties?.name
        if (!name) return

        // 计算省份中心点
        const center = f.properties?.center || getFeatureCenter(f)
        if (!center) return

        // 创建 HTML 标注元素
        const el = document.createElement('div')
        el.className = 'province-label-marker'
        el.textContent = name
        el.style.cssText = `
          color: ${skin.label};
          font-size: 11px;
          font-weight: 500;
          background: ${getLabelHaloColor(activeMapSkin.value)};
          padding: 2px 6px;
          border-radius: 3px;
          white-space: nowrap;
          pointer-events: none;
          opacity: 0.85;
        `

        // 使用 MapLibre Marker
        const marker = new maplibreGlModule.Marker(el)
          .setLngLat(center)
          .addTo(mapInstance)
        provinceLabelMarkers.push(marker)
      })
    }
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

function updateMapView() {
  if (!mapInstance) return
  mapInstance.setStyle(buildMaplibreStyle())

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
}

function startAutoRotate() {
  if (!mapInstance || globeRotateTimer) return
  globeRotateTimer = window.setInterval(() => {
    if (!globeAutoRotate || !mapInstance) return
    const bearing = mapInstance.getBearing()
    mapInstance.setBearing(bearing + 0.2)
  }, 50)
}

function stopAutoRotate() {
  if (globeRotateTimer) {
    window.clearInterval(globeRotateTimer)
    globeRotateTimer = null
  }
}

async function initMap() {
  if (!mapRef.value) return

  const maplibreGl = await loadMapLibreGL()
  maplibreGlModule = maplibreGl // 存储模块供后续使用

  mapInstance = new maplibreGl.Map({
    container: mapRef.value,
    style: buildMaplibreStyle(),
    center: [104, 36],
    zoom: 3,
    maxZoom: 18,
    minZoom: 1,
    projection: 'globe',
    attributionControl: false,
  })

  // 添加导航控件
  mapInstance.addControl(new maplibreGl.NavigationControl({ showCompass: false }), 'bottom-right')

  // 地图加载完成后的初始化
  mapInstance.on('load', async () => {
    updateFootprintMarkers()

    // 加载全国省份边界数据
    try {
      const response = await fetch('/china_full.json')
      if (response.ok) {
        const chinaGeoJson = await response.json()
        chinaGeoCache.value = chinaGeoJson
        updateChinaBoundaryLayer(chinaGeoJson)
      }
    } catch (err) {
      console.warn('加载全国边界数据失败:', err)
    }

    // 开始自动旋转（globe 模式）
    startAutoRotate()

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

  // 点击全国省份边界区域（globe视图）
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
    const zoom = mapInstance.getZoom()
    if (zoom > 5 && mapInstance.getProjection().type === 'globe') {
      // 放大到一定程度时可以考虑切换到 mercator（可选）
    }
  })

  // Resize 监听
  mapResizeObserver?.disconnect()
  mapResizeObserver = new ResizeObserver(() => requestMapResize(80))
  mapResizeObserver.observe(mapRef.value)

  mapStageBodyRef.value?.removeEventListener('wheel', handleMapWheel, true)
  mapStageBodyRef.value?.addEventListener('wheel', handleMapWheel, { passive: false, capture: true })

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
  isLoading.value = true
  loadingText.value = '初始化页面...'

  try {
    await placesStore.fetchPlaces().catch(() => {
      placesStore.provinces = []
      placesStore.cities = []
      showToast('足迹数据暂时加载失败，地图框架仍可预览', 'error', 4200)
    })
    await placesStore.fetchJourneys().catch(() => {
      placesStore.journeys = []
      showToast('旅程数据暂时加载失败，地图足迹仍可正常浏览', 'error', 4200)
    })
    await nextTick()
    await initMap()
  } finally {
    isLoading.value = false
  }
})

onUnmounted(() => {
  window.removeEventListener('resize', mobileResizeHandler)
  mapStageBodyRef.value?.removeEventListener('wheel', handleMapWheel, true)
  mapResizeObserver?.disconnect()
  if (mapResizeTimer) {
    window.clearTimeout(mapResizeTimer)
  }
  stopAutoRotate()
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
@import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@500;600;700&family=Noto+Serif+SC:wght@400;500;600;700&family=ZCOOL+XiaoWei&display=swap');

:global(body) {
  margin: 0;
  font-family: 'ZCOOL XiaoWei', 'Noto Serif SC', serif;
  background: #f6ecdf;
  color: #241a13;
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
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
  padding: 24px 28px;
  border-radius: 28px;
  margin-bottom: 24px;
}

.brand-block h1,
.narrative-card h2,
.map-stage-header h2,
.detail-header h2,
.detail-empty h2,
.section-heading h3,
.modal-header h3 {
  margin: 0;
  font-family: 'Cormorant Garamond', 'Noto Serif SC', serif;
  font-weight: 600;
}

.brand-block h1 {
  font-size: clamp(2rem, 3vw, 3rem);
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
  margin-top: 14px;
}

.breadcrumb-chip {
  border: 1px solid var(--panel-border);
  border-radius: 999px;
  background: var(--button-bg);
  padding: 8px 12px;
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
  min-height: calc(100vh - 152px);
  min-height: calc(100dvh - 152px);
}

.workspace.empty-footprints {
  grid-template-columns: minmax(620px, 1fr) minmax(340px, 520px);
}

.sidebar,
.map-stage,
.detail-panel {
  min-height: 0;
  border-radius: 32px;
}

.sidebar,
.detail-panel {
  display: flex;
  flex-direction: column;
  gap: 18px;
  padding: 24px;
  overflow: visible;
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
  font-family: 'Cormorant Garamond', 'Noto Serif SC', serif;
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
  font-family: 'Cormorant Garamond', 'Noto Serif SC', serif;
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
  top: 24px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 800;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 14px 24px;
  border-radius: 999px;
  backdrop-filter: blur(16px);
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
  transform: translateX(-50%) translateY(-20px);
}

.toast-slide-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(-20px);
}

.map-stage {
  padding: 22px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  min-height: 620px;
}

.map-stage-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 18px;
}

.stage-subcopy {
  margin: 8px 0 0;
  color: var(--text-muted);
  line-height: 1.6;
}

.map-stage-body {
  position: relative;
  isolation: isolate;
  flex: 1;
  min-height: 500px;
  overflow: hidden;
  border-radius: 26px;
  background: var(--map-stage-bg);
  border: 1px solid color-mix(in srgb, var(--map-skin-border) 28%, transparent);
  box-shadow:
    inset 0 0 0 1px rgba(255, 255, 255, 0.12),
    inset 0 -38px 90px rgba(20, 12, 6, 0.16),
    0 22px 58px color-mix(in srgb, var(--dark) 20%, transparent);
  cursor: grab;
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

.map-stage-body.skin-night .context-pill,
.map-stage-body.skin-night .overlay-toggle {
  background: rgba(255, 236, 196, 0.12);
}

.map-stage-body.transitioning .maplibre-container {
  filter: saturate(0.92) blur(1px);
  transform: translateZ(0) scale(1.01);
}

.maplibre-container {
  position: absolute;
  inset: 0;
  z-index: 1;
  width: 100%;
  height: 100%;
  min-height: 100%;
  transform: translateZ(0);
  filter: drop-shadow(0 20px 32px color-mix(in srgb, var(--map-skin-glow) 46%, transparent));
  transition: filter 0.25s ease, transform 0.25s ease;
}

.maplibre-container.muted {
  opacity: 0.12;
  filter: blur(2px) saturate(0.78);
  pointer-events: none;
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
  background: var(--map-panel-bg);
  border: 1px solid color-mix(in srgb, var(--map-skin-border) 28%, transparent);
  backdrop-filter: blur(18px);
  color: var(--map-skin-label);
  box-shadow: 0 18px 42px rgba(36, 26, 19, 0.13);
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
  font-family: 'Cormorant Garamond', 'Noto Serif SC', serif;
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

.legend-row {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 8px;
  color: color-mix(in srgb, var(--map-skin-label) 82%, transparent);
}

.legend-dot,
.legend-line {
  display: inline-flex;
  flex: none;
}

.legend-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: var(--accent);
  box-shadow: 0 0 0 6px rgba(255, 107, 107, 0.12);
}

.legend-dot.strong {
  width: 14px;
  height: 14px;
  background: #2b1d12;
  box-shadow: 0 0 0 6px rgba(43, 29, 18, 0.1);
}

.legend-line {
  width: 28px;
  height: 2px;
  background: linear-gradient(90deg, var(--primary), transparent);
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
  padding: 8px 0 12px;
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
  background: rgba(28, 18, 12, 0.34);
  backdrop-filter: blur(12px);
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
}

.theme-panel,
.auth-panel {
  width: min(520px, 100%);
}

.modal-header {
  margin-bottom: 20px;
  text-align: center;
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
  background: color-mix(in srgb, var(--button-bg) 72%, transparent);
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
}

.field-block {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.field-block span {
  font-family: 'Noto Serif SC', serif;
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

.loading-overlay {
  position: fixed;
  inset: 0;
  z-index: 700;
  background: rgba(248, 244, 232, 0.78);
  backdrop-filter: blur(8px);
  display: flex;
  align-items: center;
  justify-content: center;
}

.loading-card {
  padding: 24px 32px;
  border-radius: 24px;
  text-align: center;
}

.spinner {
  width: 42px;
  height: 42px;
  margin: 0 auto 12px;
  border-radius: 50%;
  border: 3px solid rgba(187, 77, 51, 0.16);
  border-top-color: var(--accent);
  animation: spin 0.8s linear infinite;
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
    grid-template-columns: minmax(560px, 1fr) minmax(320px, 460px);
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
    min-height: 0;
  }

  .workspace.empty-footprints {
    grid-template-columns: 1fr;
  }

  .map-stage {
    min-height: 72vh;
  }

  .detail-panel {
    grid-column: 1 / -1;
  }

  .map-stage-body {
    min-height: 58vh;
  }
}

@media (max-width: 900px) {
  .app-shell {
    padding: 16px;
    padding-bottom: 16px;
  }

  .workspace {
    grid-template-columns: 1fr;
  }

  .workspace .sidebar,
  .workspace .map-stage,
  .workspace .detail-panel {
    width: 100%;
  }

  .topbar {
    padding: 16px 20px;
  }

  .brand-block h1 {
    font-size: 1.5rem;
  }

  .brand-block p {
    display: none;
  }

  .narrative-card {
    display: none;
  }

  .map-stage {
    min-height: calc(100vh - 160px);
  }

  .map-stage-body {
    min-height: calc(100vh - 220px);
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
    padding: 16px;
    padding-bottom: 112px;
  }

  .mobile-hidden {
    display: none !important;
  }

  .map-stage {
    min-height: 620px;
  }

  .map-stage-body {
    min-height: 470px;
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

  .search-controls,
  .region-metrics,
  .photo-tools {
    grid-template-columns: 1fr;
  }

  .map-overlay-card {
    position: absolute;
    left: 12px;
    right: 12px;
    top: 12px;
    margin: 0;
    max-width: none;
    padding: 14px;
  }

  .context-pills {
    margin-top: 10px;
  }

  .legend-card {
    right: 12px;
    bottom: 76px;
    min-width: 0;
    padding: 12px;
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
    padding: 20px;
  }

  .topbar.mobile-compact .brand-block p {
    display: none;
  }

  .topbar.mobile-compact .breadcrumb-bar {
    margin-top: 8px;
  }

  .map-stage {
    padding: 14px;
    min-height: 560px;
  }

  .map-stage-body {
    min-height: 430px;
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
  padding: 8px 0 calc(8px + env(safe-area-inset-bottom));
  background: color-mix(in srgb, var(--panel-strong-bg) 94%, transparent);
  border-top: 1px solid var(--panel-border);
  backdrop-filter: blur(16px);
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
  min-height: calc(100vh - 140px);
  padding-bottom: 24px;
}

.workspace.mobile-mode .sidebar,
.workspace.mobile-mode .map-stage,
.workspace.mobile-mode .detail-panel {
  min-height: calc(100vh - 160px);
}

/* 旅程时间线卡片 */
.journey-timeline-card {
  padding: 18px;
  border-radius: 24px;
  background: rgba(255, 255, 255, 0.5);
  border: 1px solid rgba(139, 115, 85, 0.1);
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
  border: 1px solid rgba(139, 115, 85, 0.1);
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.65);
  cursor: pointer;
  transition: all 0.2s ease;
  font: inherit;
  text-align: left;
}

.journey-item:hover {
  transform: translateY(-2px);
  border-color: rgba(187, 77, 51, 0.2);
}

.journey-item.active {
  background: rgba(187, 77, 51, 0.12);
  border-color: rgba(187, 77, 51, 0.24);
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
  color: rgba(157, 106, 47, 0.9);
}

.journey-info p {
  margin: 4px 0 0;
  color: rgba(36, 26, 19, 0.6);
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
  background: rgba(255, 255, 255, 0.58);
  border: 1px solid rgba(139, 115, 85, 0.1);
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
</style>
