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
        <button v-if="currentProvince" class="ghost-btn" @click="backToChina">返回全国</button>
        <button class="ghost-btn" @click="showThemePanel = true">主题切换</button>
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

    <main class="workspace" :class="{ 'mobile-mode': isMobile }">
      <!-- 空数据引导提示 -->
      <div v-if="placesStore.cities.length === 0 && !isLoading" class="empty-state-overlay">
        <div class="empty-guide-card panel panel-soft animate-scale-in">
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
          <span class="eyebrow">Narrative First</span>
          <h2>地图继续下钻，故事继续变细</h2>
          <p>
            现在已经不是“全国看省、省里看市”就停住了。新版支持三级钻取，
            从省到市再到区县，足迹能真正落到更细的空间单元。
          </p>
        </section>

        <section class="stat-grid">
          <article class="stat-card">
            <span class="stat-label">当前可见足迹</span>
            <strong>{{ filteredCities.length }}</strong>
            <small>{{ currentCityArea ? '当前城市下的记录' : currentProvince ? '当前省份下的记录' : '全国足迹总数' }}</small>
          </article>
          <article class="stat-card">
            <span class="stat-label">走过省份</span>
            <strong>{{ visitedProvinces }}</strong>
            <small>三级地图都能联动</small>
          </article>
          <article class="stat-card">
            <span class="stat-label">照片总数</span>
            <strong>{{ totalPhotos }}</strong>
            <small>照片和故事一起沉淀</small>
          </article>
          <article class="stat-card accent-card">
            <span class="stat-label">当前层级</span>
            <strong>{{ currentViewBadge }}</strong>
            <small>{{ currentCityArea ? '点区县落点最细' : currentProvince ? '点城市继续下钻' : '点省份进入详情' }}</small>
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

        <div class="map-stage-body" :class="{ transitioning: mapTransitioning, 'timeline-mode': viewMode === 'timeline' }">
          <div v-if="viewMode === 'map'" class="map-overlay-card">
            <span class="floating-badge">{{ currentCityArea ? 'District Discovery' : currentProvince ? 'City Discovery' : 'Story Mode' }}</span>
            <h3>{{ mapOverlayTitle }}</h3>
            <p>{{ mapOverlayDescription }}</p>
            <div class="context-pills">
              <span class="context-pill">{{ currentLayerMetric }}</span>
              <span class="context-pill">{{ currentActionShort }}</span>
            </div>
          </div>

          <div ref="mapRef" class="map-canvas" :class="{ muted: viewMode === 'timeline' }"></div>
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
                @click="triggerUpload"
                @dragover.prevent="isDragover = true"
                @dragleave="isDragover = false"
                @drop.prevent="onDrop"
              >
                <input
                  ref="uploadInput"
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
                @click="triggerUpload"
                @dragover.prevent="isDragover = true"
                @dragleave="isDragover = false"
                @drop.prevent="onDrop"
              >
                <input
                  ref="uploadInput"
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
            <h3>选择主题</h3>
            <p>切换整体氛围，不改变三级钻取结构。</p>
          </div>

          <div class="theme-grid">
            <button
              v-for="theme in themeStore.themes"
              :key="theme.id"
              class="theme-card"
              :class="{ active: theme.id === themeStore.activeTheme?.id }"
              @click="applyTheme(theme)"
            >
              <div class="theme-preview" :style="getThemePreviewStyle(theme)">
                <div class="theme-preview-dot"></div>
              </div>
              <strong>{{ theme.name }}</strong>
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
import { useThemeStore } from './stores/theme'

const placesStore = usePlacesStore()
const themeStore = useThemeStore()
const editMode = useEditStore()

const mapRef = ref(null)
const uploadInput = ref(null)
const chartInstance = ref(null)

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

// 手机端适配
const isMobile = ref(window.innerWidth < 768)
const mobileView = ref('map')
const checkMobile = () => {
  isMobile.value = window.innerWidth < 768
}
const mobileResizeHandler = () => {
  checkMobile()
  chartInstance.value?.resize()
}

const currentProvince = ref(null)
const currentCityArea = ref(null)
const provinceGeoCache = ref({})
const districtGeoCache = ref({})
const hoverLabel = ref(null)
const tooltipPosition = ref({ x: 0, y: 0 })
let echartsLib = null

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

async function loadECharts() {
  if (echartsLib) return echartsLib

  const [echartsCore, charts, components, renderers] = await Promise.all([
    import('echarts/core'),
    import('echarts/charts'),
    import('echarts/components'),
    import('echarts/renderers'),
  ])

  const { use, init, registerMap } = echartsCore
  const { ScatterChart, EffectScatterChart, LinesChart } = charts
  const { GeoComponent } = components
  const { CanvasRenderer } = renderers

  use([ScatterChart, EffectScatterChart, LinesChart, GeoComponent, CanvasRenderer])
  echartsLib = { init, registerMap }
  return echartsLib
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
    '--preview-primary': theme.primary_color,
    '--preview-accent': theme.accent_color,
    '--preview-light': theme.light_color,
  }
}

const appStyle = computed(() => {
  const theme = themeStore.activeTheme
  if (!theme) return {}
  return {
    '--primary': theme.primary_color,
    '--accent': theme.accent_color,
    '--dark': theme.dark_color,
    '--light': theme.light_color,
  }
})

const currentViewName = computed(() => {
  if (currentCityArea.value) return `${currentCityArea.value.name} 区县视图`
  if (currentProvince.value) return `${currentProvince.value.name} 城市视图`
  return '我们的足迹'
})

const currentViewBadge = computed(() => {
  if (currentCityArea.value) return 'District View'
  if (currentProvince.value) return 'City View'
  return 'National View'
})

const currentViewDescription = computed(() => {
  if (currentCityArea.value) {
    return '现在看到的是区县级别的地图，可以把一次城市旅行拆成更细的记忆点。'
  }
  if (currentProvince.value) {
    return '省内模式支持继续下钻，点击城市进入区县层，再把足迹落到更细的位置。'
  }
  return '从全国出发，一路下钻到区县，让旅行记忆既有叙事感，也有空间精度。'
})

const breadcrumbTrail = computed(() => {
  const trail = [{ id: 'china', label: '全国', active: !currentProvince.value && !currentCityArea.value }]
  if (currentProvince.value) {
    trail.push({ id: 'province', label: currentProvince.value.name, active: !currentCityArea.value })
  }
  if (currentCityArea.value) {
    trail.push({ id: 'city', label: currentCityArea.value.name, active: true })
  }
  return trail
})

const mapStageTitle = computed(() => {
  if (currentCityArea.value) return `${currentCityArea.value.name} · 区县足迹图谱`
  if (currentProvince.value) return `${currentProvince.value.name} · 城市足迹图谱`
  return '中国足迹总览'
})

const currentActionHint = computed(() => {
  if (currentCityArea.value) {
    return editMode.isAuthenticated
      ? '点击区县可直接新增区县级足迹，点击已记录点位可打开详情。'
      : '浏览区县层细节时，可以直接点已有记录查看这座城市里更细的回忆。'
  }
  if (currentProvince.value) {
    return '这里的城市现在是中间层，点击城市会继续进入区县地图。'
  }
  return '从全国地图进入省份，再逐层下钻到更精细的位置。'
})

const currentLayerMetric = computed(() => {
  if (currentCityArea.value) return `${availableDistricts.value.length || 0} 个区县单元`
  if (currentProvince.value) return `${availableCities.value.length || 0} 个城市单元`
  return `${placesStore.provinces.length || 0} 个省级单元`
})

const currentActionShort = computed(() => {
  if (currentCityArea.value) return '区县层可精细记录'
  if (currentProvince.value) return '继续下钻到区县'
  return '先选一个省份'
})

const mapOverlayTitle = computed(() => {
  if (currentCityArea.value) return '点区县补足迹，点记录看细节'
  if (currentProvince.value) return '点城市继续下钻，点足迹直接看详情'
  return '地图不再只是地理坐标的堆叠'
})

const mapOverlayDescription = computed(() => {
  if (currentCityArea.value) {
    return '区县层让地图真正从“旅行过这座城”变成“在哪些地方留下了记忆”。'
  }
  if (currentProvince.value) {
    return '现在省内城市不再直接作为终点，而是三级钻取中的中间层，能继续进到区县。'
  }
  return '新版把操作、阅读和筛选拆到了不同层级，先看故事，再看地图，再决定要不要继续下钻。'
})

const emptyDetailTitle = computed(() => {
  if (currentCityArea.value) return '从区县里点开更细的回忆'
  if (currentProvince.value) return '从省内挑一座城市继续下钻'
  return '先从地图里点开一段故事'
})

const emptyDetailDescription = computed(() => {
  if (currentCityArea.value) {
    return '如果进入了编辑模式，点击区县区域就能把足迹精确落到更细的位置。'
  }
  if (currentProvince.value) {
    return '省内地图现在支持三级钻取，先点击城市进入区县层，再决定具体记录在哪个区县。'
  }
  return '你可以先从左侧时间线进入，也可以直接在全国地图上点任意一个省份。'
})

const collectionTip = computed(() => {
  if (currentCityArea.value) {
    return '当前列表只显示这座城市下的区县级足迹，方便比对同城不同区域的回忆。'
  }
  if (currentProvince.value) {
    return '这里汇总的是当前省份里的足迹，点任意城市都可以继续进入区县层。'
  }
  return '列表与地图同步筛选，适合从时间线之外快速跳回某条旧记录。'
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
  return '全国旅行资产'
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

async function applyTheme(theme) {
  await themeStore.setActive(theme.id)
  showThemePanel.value = false
  updateMapView()
}

async function submitPassword() {
  if (!passwordInput.value) return
  authError.value = ''
  await editMode.login(passwordInput.value)
  if (editMode.isAuthenticated) {
    showPasswordModal.value = false
    passwordInput.value = ''
    return
  }
  authError.value = editMode.error || '登录失败'
}

function triggerUpload() {
  uploadInput.value?.click()
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
  if (!chartInstance.value) return
  const targetZoom = currentCityArea.value ? 3.8 : currentProvince.value ? 3 : 1.8
  chartInstance.value.setOption({
    geo: {
      center: [city.longitude, city.latitude],
      zoom: targetZoom,
    },
  })
}

function zoomIn() {
  if (!chartInstance.value) return
  const option = chartInstance.value.getOption()
  const currentZoom = option.geo?.[0]?.zoom || 1.2
  chartInstance.value.setOption({
    geo: {
      zoom: Math.min(currentZoom * 1.25, 9),
    },
  })
}

function zoomOut() {
  if (!chartInstance.value) return
  const option = chartInstance.value.getOption()
  const currentZoom = option.geo?.[0]?.zoom || 1.2
  chartInstance.value.setOption({
    geo: {
      zoom: Math.max(currentZoom / 1.25, currentCityArea.value ? 1 : currentProvince.value ? 1.2 : 0.9),
    },
  })
}

function resetView() {
  if (!chartInstance.value) return

  if (currentCityArea.value) {
    chartInstance.value.setOption({
      geo: {
        center: currentCityArea.value.center,
        zoom: 1.2,
      },
    })
    return
  }

  if (currentProvince.value) {
    chartInstance.value.setOption({
      geo: {
        center: [currentProvince.value.center_lon, currentProvince.value.center_lat],
        zoom: 1.8,
      },
    })
    return
  }

  chartInstance.value.setOption({
    geo: {
      center: [104, 36],
      zoom: 1.15,
    },
  })
}

async function loadProvinceMap(province) {
  if (!province?.adcode) return
  isLoading.value = true
  loadingText.value = `进入 ${province.name}...`
  mapTransitioning.value = true
  transitionText.value = `进入 ${province.name}`

  try {
    if (!provinceGeoCache.value[province.adcode]) {
      const response = await fetch(`/provinces/${province.adcode}.json`)
      provinceGeoCache.value[province.adcode] = await response.json()
    }

    echartsLib.registerMap(`province-${province.adcode}`, provinceGeoCache.value[province.adcode])
    currentProvince.value = province
    currentCityArea.value = null
    activeFilter.value = 'all'
    closeFootprintPanel()
    updateMapView()
  } finally {
    isLoading.value = false
    window.setTimeout(() => {
      mapTransitioning.value = false
    }, 260)
  }
}

async function loadDistrictMap(cityFeature) {
  const cityAdcode = cityFeature?.properties?.adcode ? String(cityFeature.properties.adcode) : ''
  if (!cityAdcode) return

  isLoading.value = true
  loadingText.value = `进入 ${cityFeature.properties?.name || ''}...`
  mapTransitioning.value = true
  transitionText.value = `进入 ${normalizeRegionName(cityFeature.properties?.name || '')}`

  try {
    if (!districtGeoCache.value[cityAdcode]) {
      const response = await fetch(`/api/places/geo/cities/${cityAdcode}/districts`)
      districtGeoCache.value[cityAdcode] = await response.json()
    }

    echartsLib.registerMap(`district-${cityAdcode}`, districtGeoCache.value[cityAdcode])
    currentCityArea.value = {
      name: normalizeRegionName(cityFeature.properties?.name || ''),
      adcode: cityAdcode,
      center: cityFeature.properties?.center || cityFeature.properties?.centroid || [currentProvince.value.center_lon, currentProvince.value.center_lat],
    }
    activeFilter.value = 'all'
    closeFootprintPanel()
    updateMapView()
  } finally {
    isLoading.value = false
    window.setTimeout(() => {
      mapTransitioning.value = false
    }, 260)
  }
}

function backToChina() {
  mapTransitioning.value = true
  transitionText.value = '返回全国'
  currentProvince.value = null
  currentCityArea.value = null
  activeFilter.value = 'all'
  closeFootprintPanel()
  updateMapView()
  window.setTimeout(() => {
    mapTransitioning.value = false
  }, 260)
}

function backToProvince() {
  mapTransitioning.value = true
  transitionText.value = `返回 ${currentProvince.value?.name || '省份'}`
  currentCityArea.value = null
  activeFilter.value = 'all'
  closeFootprintPanel()
  updateMapView()
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

function getMapBaseOption() {
  const theme = themeStore.activeTheme
  const mapName = currentCityArea.value
    ? `district-${currentCityArea.value.adcode}`
    : currentProvince.value
      ? `province-${currentProvince.value.adcode}`
      : 'china'

  const center = currentCityArea.value
    ? currentCityArea.value.center
    : currentProvince.value
      ? [currentProvince.value.center_lon, currentProvince.value.center_lat]
      : [104, 36]

  return {
    backgroundColor: 'transparent',
    tooltip: { show: false },
    geo: {
      map: mapName,
      roam: true,
      center,
      zoom: currentCityArea.value ? 1.2 : currentProvince.value ? 1.8 : 1.15,
      scaleLimit: {
        min: currentCityArea.value ? 0.9 : currentProvince.value ? 0.8 : 0.9,
        max: 9,
      },
      label: { show: false },
      itemStyle: {
        areaColor: theme?.light_color || '#F8F4E8',
        borderColor: theme?.primary_color || '#E8B4B8',
        borderWidth: 1,
        shadowColor: 'rgba(52,33,17,0.10)',
        shadowBlur: 14,
      },
      emphasis: {
        label: { show: false },
        itemStyle: {
          areaColor: theme?.primary_color || '#E8B4B8',
          borderColor: theme?.accent_color || '#FF6B6B',
          borderWidth: 2,
        },
      },
    },
    series: [
      {
        type: 'lines',
        coordinateSystem: 'geo',
        zlevel: 1,
        data: buildLineData(filteredCities.value),
        effect: {
          show: filteredCities.value.length > 1,
          period: 6,
          trailLength: 0.1,
          symbolSize: 5,
        },
        lineStyle: {
          color: theme?.primary_color || '#E8B4B8',
          width: 1.5,
          curveness: 0.12,
          opacity: 0.55,
        },
      },
      // 旅程路线 - 飞机
      {
        type: 'lines',
        name: 'journey-flight',
        coordinateSystem: 'geo',
        zlevel: 1,
        data: buildJourneyLineData(placesStore.journeys, 'flight'),
        effect: {
          show: placesStore.journeys.some(j => j.transport_type === 'flight'),
          period: 8,
          trailLength: 0.15,
          symbol: getTransportSymbol('flight'),
          symbolSize: 12,
          color: '#4A90D9',
        },
        lineStyle: {
          color: '#4A90D9',
          width: 2.5,
          curveness: 0.5,
          opacity: 0.85,
        },
        emphasis: {
          lineStyle: {
            width: 4,
            opacity: 1,
          },
        },
      },
      // 旅程路线 - 火车
      {
        type: 'lines',
        name: 'journey-train',
        coordinateSystem: 'geo',
        zlevel: 1,
        data: buildJourneyLineData(placesStore.journeys, 'train'),
        effect: {
          show: placesStore.journeys.some(j => j.transport_type === 'train'),
          period: 10,
          trailLength: 0.2,
          symbol: getTransportSymbol('train'),
          symbolSize: 10,
          color: '#4A9B7C',
        },
        lineStyle: {
          color: '#4A9B7C',
          width: 2,
          type: 'dashed',
          curveness: 0,
          opacity: 0.75,
        },
        emphasis: {
          lineStyle: {
            width: 3,
            opacity: 1,
          },
        },
      },
      // 旅程路线 - 汽车
      {
        type: 'lines',
        name: 'journey-car',
        coordinateSystem: 'geo',
        zlevel: 1,
        data: buildJourneyLineData(placesStore.journeys, 'car'),
        effect: {
          show: placesStore.journeys.some(j => j.transport_type === 'car'),
          period: 12,
          trailLength: 0.1,
          symbol: getTransportSymbol('car'),
          symbolSize: 8,
          color: '#F6AD55',
        },
        lineStyle: {
          color: '#F6AD55',
          width: 2.5,
          curveness: 0.2,
          opacity: 0.7,
        },
        emphasis: {
          lineStyle: {
            width: 4,
            opacity: 1,
          },
        },
      },
      // 旅程路线 - 轮船
      {
        type: 'lines',
        name: 'journey-ship',
        coordinateSystem: 'geo',
        zlevel: 1,
        data: buildJourneyLineData(placesStore.journeys, 'ship'),
        effect: {
          show: placesStore.journeys.some(j => j.transport_type === 'ship'),
          period: 14,
          trailLength: 0.25,
          symbol: getTransportSymbol('ship'),
          symbolSize: 10,
          color: '#2C5F4D',
        },
        lineStyle: {
          color: '#2C5F4D',
          width: 2,
          curveness: 0.35,
          opacity: 0.75,
        },
        emphasis: {
          lineStyle: {
            width: 3,
            opacity: 1,
          },
        },
      },
      {
        type: 'scatter',
        coordinateSystem: 'geo',
        zlevel: 2,
        symbolSize: (value, params) => {
          const count = params.data?.symbolSizeValue || 1
          return Math.min(24, 12 + count * 3 + ((value[2] || 0) > 0 ? 2 : 0))
        },
        data: buildScatterData(footprintGroups.value),
        itemStyle: {
          color: theme?.accent_color || '#FF6B6B',
          borderColor: 'rgba(255,255,255,0.7)',
          borderWidth: 2,
          shadowBlur: 18,
          shadowColor: theme?.accent_color || '#FF6B6B',
        },
        label: {
          show: true,
          position: 'right',
          distance: 8,
          color: theme?.dark_color || '#8B7355',
          fontFamily: 'Noto Serif SC',
          fontSize: 12,
          formatter: '{b}',
        },
      },
      {
        type: 'effectScatter',
        coordinateSystem: 'geo',
        zlevel: 3,
        rippleEffect: {
          brushType: 'stroke',
          scale: 4,
          period: 4,
        },
        symbolSize: (value, params) => {
          const count = params.data?.symbolSizeValue || 1
          return Math.min(14, 6 + count * 2 + ((value[2] || 0) > 0 ? 1 : 0))
        },
        data: buildScatterData(footprintGroups.value),
        itemStyle: {
          color: theme?.accent_color || '#FF6B6B',
          opacity: 0.72,
        },
      },
    ],
  }
}

function updateMapView() {
  if (!chartInstance.value) return
  chartInstance.value.setOption(getMapBaseOption(), {
    notMerge: true,
    lazyUpdate: false,
  })
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
  if (chartInstance.value && journey.from_lon && journey.to_lon) {
    const centerLon = (journey.from_lon + journey.to_lon) / 2
    const centerLat = (journey.from_lat + journey.to_lat) / 2
    chartInstance.value.setOption({
      geo: {
        center: [centerLon, centerLat],
        zoom: 2.5,
      },
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

async function initMap() {
  if (!mapRef.value) return

  echartsLib = await loadECharts()

  const response = await fetch('/china_full.json')
  const geoJson = await response.json()
  echartsLib.registerMap('china', geoJson)

  chartInstance.value = echartsLib.init(mapRef.value)
  updateMapView()

  chartInstance.value.on('mouseover', 'geo', (params) => {
    tooltipPosition.value = {
      x: params.event.offsetX + 24,
      y: params.event.offsetY - 24,
    }

    if (currentCityArea.value) {
      hoverLabel.value = {
        title: normalizeRegionName(params.name),
        subtitle: editMode.isAuthenticated ? '点击添加或查看区县足迹' : '当前城市下的区县区域',
      }
      return
    }

    if (currentProvince.value) {
      hoverLabel.value = {
        title: normalizeRegionName(params.name),
        subtitle: '点击进入区县视图',
      }
      return
    }

    const province = getProvinceByName(params.name)
    if (province) {
      const count = placesStore.cities.filter((city) => city.province_id === province.id).length
      hoverLabel.value = {
        title: province.name,
        subtitle: `${count} 条城市足迹 · 点击进入`,
      }
    }
  })

  chartInstance.value.on('mouseout', 'geo', () => {
    hoverLabel.value = null
  })

  chartInstance.value.on('click', 'geo', async (params) => {
    if (currentCityArea.value) {
      const districtName = normalizeRegionName(params.name)
      const matches = placesStore.cities.filter(
        (city) =>
          city.city_adcode === currentCityArea.value.adcode &&
          normalizeRegionName(city.district_name || '') === districtName,
      )

      if (matches.length > 1) {
        openCluster(matches, `${currentCityArea.value.name} · ${districtName}`)
        return
      }

      if (matches.length === 1) {
        await selectFootprint(matches[0].id)
        return
      }

      if (!editMode.isAuthenticated) return

      const district = availableDistricts.value.find((item) => item.value === districtName)
      formData.value = {
        city_name: currentCityArea.value.name,
        province_id: currentProvince.value.id,
        province_name: currentProvince.value.name,
        city_adcode: currentCityArea.value.adcode,
        district_name: districtName,
        district_adcode: district?.adcode || '',
        visited_at: '',
        description: '',
        tags: '',
        latitude: district?.center?.[1] ?? null,
        longitude: district?.center?.[0] ?? null,
      }
      showAddPanel.value = true
      return
    }

    if (currentProvince.value) {
      const cityFeature = findCityFeatureByName(params.name)
      if (cityFeature) {
        await loadDistrictMap(cityFeature)
      }
      return
    }

    const province = getProvinceByName(params.name)
    if (province) {
      await loadProvinceMap(province)
    }
  })

  chartInstance.value.on('click', 'series.scatter', async (params) => {
    const records = params.data?.records || []
    if (records.length > 1) {
      openCluster(records, params.data.name)
    } else if (records.length === 1) {
      await selectFootprint(records[0].id)
    }
  })

  chartInstance.value.on('click', 'series.effectScatter', async (params) => {
    const records = params.data?.records || []
    if (records.length > 1) {
      openCluster(records, params.data.name)
    } else if (records.length === 1) {
      await selectFootprint(records[0].id)
    }
  })

  window.addEventListener('resize', mobileResizeHandler)
}

onMounted(async () => {
  editMode.checkEditMode()
  isLoading.value = true
  loadingText.value = '初始化页面...'

  try {
    await themeStore.fetchThemes()
    await themeStore.fetchActiveTheme()
    await placesStore.fetchPlaces()
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
  clearPendingPhotos()
  chartInstance.value?.dispose()
})

watch(
  () => themeStore.activeTheme,
  () => updateMapView(),
  { deep: true },
)

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
  background:
    radial-gradient(circle at top left, rgba(255, 247, 237, 0.95), transparent 32%),
    radial-gradient(circle at bottom right, rgba(212, 165, 116, 0.18), transparent 30%),
    linear-gradient(135deg, var(--light) 0%, rgba(248, 244, 232, 0.96) 45%, #e8ddcc 100%);
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
  background: radial-gradient(circle, rgba(255, 107, 107, 0.22), transparent 70%);
}

.orb-2 {
  width: 28rem;
  height: 28rem;
  right: -5rem;
  top: 10rem;
  background: radial-gradient(circle, rgba(212, 165, 116, 0.24), transparent 70%);
  animation-delay: -5s;
}

.orb-3 {
  width: 24rem;
  height: 24rem;
  left: 26%;
  bottom: -5rem;
  background: radial-gradient(circle, rgba(232, 180, 184, 0.25), transparent 70%);
  animation-delay: -9s;
}

.light-rays,
.noise-overlay {
  position: absolute;
  inset: 0;
}

.light-rays {
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.16), transparent 35%);
}

.noise-overlay {
  opacity: 0.04;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 200 200'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
}

.panel {
  position: relative;
  z-index: 1;
  border: 1px solid rgba(139, 115, 85, 0.12);
  backdrop-filter: blur(18px);
  -webkit-backdrop-filter: blur(18px);
}

.panel-soft {
  background: rgba(255, 252, 247, 0.74);
}

.panel-strong {
  background: rgba(255, 250, 243, 0.84);
  box-shadow: 0 18px 60px rgba(44, 27, 14, 0.1);
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
  color: rgba(36, 26, 19, 0.7);
  line-height: 1.7;
}

.breadcrumb-bar {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 14px;
}

.breadcrumb-chip {
  border: 1px solid rgba(139, 115, 85, 0.12);
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.68);
  padding: 8px 12px;
  cursor: pointer;
  color: #241a13;
  transition: all 0.2s ease;
}

.breadcrumb-chip.active {
  background: rgba(187, 77, 51, 0.12);
  border-color: rgba(187, 77, 51, 0.24);
  color: #a84a31;
}

.eyebrow {
  display: inline-flex;
  margin-bottom: 10px;
  color: rgba(157, 106, 47, 0.92);
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
  background: rgba(255, 255, 255, 0.65);
  color: rgba(187, 77, 51, 0.95);
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
  background: rgba(255, 255, 255, 0.7);
  color: #241a13;
  box-shadow: 0 8px 24px rgba(50, 32, 18, 0.06);
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
  background: linear-gradient(135deg, #2f2116 0%, #6e4928 100%);
  color: #fff8ef;
  box-shadow: 0 12px 28px rgba(47, 33, 22, 0.16);
}

.primary-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.danger-btn {
  width: 100%;
  background: rgba(187, 77, 51, 0.12);
  color: #a53f28;
}

.ghost-btn:disabled,
.primary-btn:disabled,
.danger-btn:disabled {
  cursor: not-allowed;
  opacity: 0.45;
  transform: none;
}

.active-badge {
  background: rgba(187, 77, 51, 0.14);
  color: #b54c33;
}

.workspace {
  position: relative;
  z-index: 1;
  display: grid;
  grid-template-columns: minmax(290px, 360px) minmax(520px, 1fr) minmax(300px, 380px);
  gap: 24px;
  align-items: stretch;
  min-height: calc(100vh - 152px);
  min-height: calc(100dvh - 152px);
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
  background: rgba(255, 255, 255, 0.5);
  border: 1px solid rgba(139, 115, 85, 0.1);
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
  background: rgba(255, 255, 255, 0.52);
  border: 1px solid rgba(139, 115, 85, 0.1);
  transition: transform 0.22s ease, border-color 0.22s ease, background 0.22s ease;
}

.stat-card:hover,
.region-card:hover,
.filter-card:hover,
.timeline-card:hover,
.memory-list-card:hover {
  transform: translateY(-2px);
  border-color: rgba(187, 77, 51, 0.18);
  background-color: rgba(255, 255, 255, 0.62);
}

.stat-card strong {
  display: block;
  margin: 8px 0 6px;
  font-family: 'Cormorant Garamond', 'Noto Serif SC', serif;
  font-size: 2rem;
}

.stat-label,
.legend-title {
  color: rgba(36, 26, 19, 0.66);
  font-size: 0.82rem;
}

.accent-card {
  background: linear-gradient(135deg, rgba(47, 33, 22, 0.95), rgba(113, 74, 40, 0.9));
  color: #fff7ed;
}

.accent-card .stat-label,
.accent-card small {
  color: rgba(255, 247, 237, 0.75);
}

.region-card {
  padding: 18px;
  border-radius: 26px;
  background:
    linear-gradient(135deg, rgba(255, 252, 247, 0.78), rgba(236, 211, 182, 0.36)),
    radial-gradient(circle at top right, rgba(187, 77, 51, 0.12), transparent 34%);
  border: 1px solid rgba(139, 115, 85, 0.12);
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
  background: rgba(255, 255, 255, 0.56);
}

.region-metrics strong {
  display: block;
  font-family: 'Cormorant Garamond', 'Noto Serif SC', serif;
  font-size: 1.55rem;
}

.region-metrics span,
.region-card p {
  color: rgba(36, 26, 19, 0.62);
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
  border: 1px solid rgba(139, 115, 85, 0.14);
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.72);
  padding: 10px 12px;
  font: inherit;
  color: #241a13;
}

.search-input:focus,
.year-select:focus {
  outline: 2px solid rgba(187, 77, 51, 0.16);
  border-color: rgba(187, 77, 51, 0.26);
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
  border: 1px solid rgba(139, 115, 85, 0.12);
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.72);
  color: #241a13;
  cursor: pointer;
  transition: all 0.25s ease;
}

.chip span {
  padding: 2px 8px;
  border-radius: 999px;
  background: rgba(187, 77, 51, 0.08);
  color: rgba(187, 77, 51, 0.9);
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
  background: rgba(187, 77, 51, 0.12);
  border-color: rgba(187, 77, 51, 0.24);
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
  border: 1px solid rgba(139, 115, 85, 0.1);
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.65);
  cursor: pointer;
  transition: all 0.25s ease;
}

.timeline-item.active,
.memory-item.active {
  background: rgba(187, 77, 51, 0.12);
  border-color: rgba(187, 77, 51, 0.24);
}

.timeline-item small,
.memory-item small {
  display: block;
  margin-bottom: 4px;
  color: rgba(157, 106, 47, 0.9);
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
  background: rgba(255, 255, 255, 0.55);
  color: rgba(36, 26, 19, 0.64);
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
  max-width: 420px;
  padding: 32px;
  border-radius: 32px;
  text-align: center;
  pointer-events: auto;
  margin-top: -80px;
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
  color: rgba(36, 26, 19, 0.7);
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
  background: linear-gradient(135deg, #2f2116 0%, #6e4928 100%);
  color: #fff8ef;
  font-weight: 600;
  display: flex;
  align-items: center;
  justify-content: center;
}

.step-text {
  font-size: 0.85rem;
  color: rgba(36, 26, 19, 0.7);
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
  min-height: 680px;
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
  color: rgba(36, 26, 19, 0.68);
  line-height: 1.6;
}

.map-stage-body {
  position: relative;
  flex: 1;
  min-height: 560px;
  overflow: hidden;
  border-radius: 26px;
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.7), rgba(244, 235, 223, 0.56)),
    radial-gradient(circle at top right, rgba(187, 77, 51, 0.12), transparent 22%);
  border: 1px solid rgba(139, 115, 85, 0.1);
}

.map-stage-body.transitioning .map-canvas {
  filter: saturate(0.92) blur(1px);
  transform: scale(0.995);
}

.map-canvas {
  transition: filter 0.25s ease, transform 0.25s ease;
}

.map-canvas.muted {
  opacity: 0.12;
  filter: blur(2px) saturate(0.78);
  pointer-events: none;
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
  color: rgba(36, 26, 19, 0.78);
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
  background: rgba(255, 252, 247, 0.82);
  border: 1px solid rgba(139, 115, 85, 0.1);
}

.map-overlay-card h3 {
  margin: 0 0 10px;
  font-family: 'Noto Serif SC', serif;
  font-size: 1.3rem;
}

.floating-badge {
  display: inline-flex;
  margin-bottom: 10px;
  padding: 6px 10px;
  border-radius: 999px;
  background: rgba(187, 77, 51, 0.1);
  color: rgba(187, 77, 51, 0.95);
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
  background: rgba(255, 255, 255, 0.72);
  border: 1px solid rgba(139, 115, 85, 0.1);
  color: rgba(36, 26, 19, 0.78);
}

.map-canvas {
  width: 100%;
  height: 100%;
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
  background: rgba(255, 255, 255, 0.56);
  color: rgba(36, 26, 19, 0.68);
}

.legend-card {
  right: 18px;
  bottom: 18px;
  min-width: 180px;
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
  background: rgba(255, 252, 247, 0.86);
  border: 1px solid rgba(139, 115, 85, 0.12);
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
  color: rgba(36, 26, 19, 0.62);
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
  color: rgba(36, 26, 19, 0.58);
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
  color: rgba(36, 26, 19, 0.72);
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
  border-color: rgba(187, 77, 51, 0.24);
}

.cluster-item small {
  display: block;
  margin-bottom: 4px;
  color: rgba(157, 106, 47, 0.9);
}

.cluster-item strong {
  display: block;
  margin-bottom: 4px;
}

.cluster-item p {
  margin: 0;
  color: rgba(36, 26, 19, 0.68);
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
  background: rgba(255, 255, 255, 0.58);
  border: 1px solid rgba(139, 115, 85, 0.1);
}

.helper-card strong {
  display: block;
  margin-bottom: 6px;
  font-family: 'Noto Serif SC', serif;
}

.helper-card-accent {
  background: linear-gradient(135deg, rgba(187, 77, 51, 0.12), rgba(255, 255, 255, 0.62));
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
  border: 1px solid rgba(139, 115, 85, 0.14);
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.72);
  padding: 14px 16px;
  font: inherit;
  color: #241a13;
}

.field-control:focus {
  outline: 2px solid rgba(187, 77, 51, 0.16);
  border-color: rgba(187, 77, 51, 0.26);
}

.textarea {
  resize: vertical;
}

.quick-tag {
  border: 1px solid rgba(157, 106, 47, 0.14);
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.78);
  padding: 10px 12px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.upload-box {
  border: 1.5px dashed rgba(157, 106, 47, 0.36);
  border-radius: 20px;
  background: rgba(255, 255, 255, 0.48);
  padding: 24px;
  text-align: center;
  cursor: pointer;
  transition: all 0.25s ease;
}

.upload-box.dragover,
.upload-box:hover {
  border-color: rgba(187, 77, 51, 0.5);
  background: rgba(187, 77, 51, 0.05);
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
  border: 1px solid rgba(139, 115, 85, 0.12);
  border-radius: 20px;
  background: rgba(255, 255, 255, 0.65);
  padding: 14px;
  cursor: pointer;
}

.theme-card.active {
  border-color: rgba(187, 77, 51, 0.24);
  background: rgba(187, 77, 51, 0.08);
}

.theme-preview {
  height: 70px;
  border-radius: 16px;
  margin-bottom: 10px;
  background: var(--preview-light);
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

@media (max-width: 1380px) {
  .app-shell {
    overflow-x: hidden;
    overflow-y: auto;
  }

  .workspace {
    grid-template-columns: 1fr;
    min-height: 0;
  }

  .map-stage {
    min-height: 72vh;
  }

  .map-stage-body {
    min-height: 58vh;
  }
}

@media (max-width: 768px) {
  .app-shell {
    padding: 16px;
    padding-bottom: 72px;
  }

  .workspace {
    grid-template-columns: 1fr;
  }

  .workspace .sidebar,
  .workspace .map-stage,
  .workspace .detail-panel {
    width: 100%;
  }

  .mobile-hidden {
    display: none !important;
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

@media (max-width: 820px) {
  .app-shell {
    padding: 16px;
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

  .map-overlay-card p {
    display: none;
  }

  .context-pills {
    margin-top: 10px;
  }

  .legend-card {
    right: 12px;
    bottom: 12px;
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
    padding-bottom: 72px;
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
  padding: 8px 0;
  background: rgba(255, 252, 247, 0.95);
  border-top: 1px solid rgba(139, 115, 85, 0.12);
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
  color: rgba(36, 26, 19, 0.7);
  cursor: pointer;
  transition: all 0.2s ease;
}

.nav-item:hover,
.nav-item.active {
  background: rgba(187, 77, 51, 0.1);
  color: #b54c33;
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
