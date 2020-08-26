<template>
  <li
    role="treeitem"
    :class="classes"
    :draggable="draggable"
    @dragstart.stop="handleDragStart($event, _self, _self.model)"
    @dragend.stop.prevent="handleDragEnd($event, _self, _self.model)"
    @dragover.prevent="handleDragOver($event, _self, _self.model)"
    @dragenter.stop.prevent="handleDragEnter($event, _self, _self.model)"
    @dragleave.stop.prevent="handleDragLeave($event, _self, _self.model)"
    @drop.stop.prevent="handleItemDrop($event, _self, _self.model)"
  >
    <div
      v-if="isWholeRow"
      role="presentation"
      :class="wholeRowClasses"
    >
&nbsp;
    </div>
    <i
      class="tree-icon tree-ocl"
      role="presentation"
      @click="handleItemToggle"
    />
    <div
      :class="anchorClasses"
      v-on="events"
    >
      <i
        v-if="showCheckbox && !model.loading"
        class="tree-icon tree-checkbox"
        role="presentation"
      />
      <slot
        :vm="this"
        :model="model"
      >
        <i
          v-if="!model.loading"
          :class="themeIconClasses"
          role="presentation"
        />
        <span v-html="model[textFieldName]" />
      </slot>
    </div>
    <ul
      v-if="isFolder && model.opened"
      ref="group"
      role="group"
      class="tree-children"
      :style="groupStyle"
    >
      <tree-item
        v-for="(child, index) in model.visibleChildren"
        :key="index"
        :data="child"
        :text-field-name="textFieldName"
        :value-field-name="valueFieldName"
        :children-field-name="childrenFieldName"
        :item-events="itemEvents"
        :whole-row="wholeRow"
        :show-checkbox="showCheckbox"
        :allow-transition="allowTransition"
        :height="height"
        :parent-item="model[childrenFieldName]"
        :draggable="draggable"
        :drag-over-background-color="dragOverBackgroundColor"
        :on-item-click="onItemClick"
        :on-item-toggle="onItemToggle"
        :on-item-drag-start="onItemDragStart"
        :on-item-drag-end="onItemDragEnd"
        :on-item-drop="onItemDrop"
        :klass="index === model[childrenFieldName].length-1?'tree-last':''"
        :parent-tree-node="node"
        :on-drag-over-open-folder-timeout="onDragOverOpenFolderTimeout"
      >
        <template slot-scope="_">
          <slot
            :vm="_.vm"
            :model="_.model"
          >
            <i
              v-if="!model.loading"
              :class="_.vm.themeIconClasses"
              role="presentation"
            />
            <span v-html="_.model[textFieldName]" />
          </slot>
        </template>
      </tree-item>
    </ul>
  </li>
</template>
<script lang="js">
  export default {
      name: 'TreeItem',
      props: {
          parentTreeNode: { 
            validator: prop => typeof prop === 'object' || prop === null, 
            required: true 
          },
          data: {type: Object, required: true},
          textFieldName: {type: String},
          valueFieldName: {type: String},
          childrenFieldName: {type: String},
          itemEvents: {type: Object},
          wholeRow: {type: Boolean, default: false},
          showCheckbox: {type: Boolean, default: false},
          allowTransition: {type: Boolean, default: true},
          height: {type: Number, default: 34},
          parentItem: {type: Array},
          draggable: {type: Boolean, default: false},
          dragOverBackgroundColor: {type: String},
          onDragOverOpenFolderTimeout: { type: Number, required: true },
          onItemClick: {
              type: Function, default: () => false
          },
          onItemToggle: {
              type: Function, default: () => false
          },
          onItemDragStart: {
              type: Function, default: () => false
          },
          onItemDragOver: {
              type: Function, default: () => false
          },
          onItemDragEnd: {
              type: Function, default: () => false
          },
          onItemDrop: {
              type: Function, default: () => false
          },
          klass: String
      },
      data () {
          return {
              isTreeNode: true,
              node: this,
              isHover: false,
              isDragEnter: false,
              isBeingDragged: false,
              dragOverCount: 0,
              isDraggingOverUpwards: false,
              isDraggingOverDownwards: false,
              isDragOverFolderOpenScheduled: false,
              model: this.data,
              maxHeight: 0,
              events: {}
          }
      },
      computed: {
          isFolder () {
              return this.model.isFolder
          },
          classes () {
            const classes = [
              {'tree-node': true},
              {'tree-open': this.model.opened},
              {'tree-closed': !this.model.opened},
              {'tree-leaf': !this.isFolder},
              {'tree-loading': !!this.model.loading},
              {'tree-drag-enter': this.isDragEnter},
              {'tree-dragover-top': this.isDraggingOverUpwards && (this.dragOverCount > 0)},
              {'tree-dragover-bottom': this.isDraggingOverDownwards && (this.dragOverCount > 0)},
              {'tree-dragover-middle': !this.isDraggingOverDownwards && !this.isDraggingOverUpwards && (this.dragOverCount > 0)},
              {[this.klass]: !!this.klass}
            ]

            return classes
          },
          anchorClasses () {
              return [
                  {'tree-anchor': true},
                  {'tree-disabled': this.model.disabled},
                  {'tree-selected': this.model.selected},
                  {'tree-hovered': this.isHover}
              ]
          },
          wholeRowClasses () {
              return [
                  {'tree-wholerow': true},
                  {'tree-wholerow-clicked': this.model.selected},
                  {'tree-wholerow-hovered': this.isHover}
              ]
          },
          themeIconClasses () {
              return [
                  {'tree-icon': true},
                  {'tree-themeicon': true},
                  {[this.model.icon]: !!this.model.icon},
                  {'tree-themeicon-custom': !!this.model.icon}
              ]
          },
          isWholeRow () {
              if (this.wholeRow) {
                  if (this.$parent.model === undefined) {
                      return true
                  } else if (this.$parent.model.opened === true) {
                      return true
                  } else {
                      return false
                  }
              }
          },
          groupStyle () {
              return {
                  'position': this.model.opened ? '' : 'relative',
                  'max-height': !!this.allowTransition ? this.maxHeight + 'px' : '',
                  'transition-duration': !!this.allowTransition ? Math.ceil(this.model[this.childrenFieldName].length / 100) * 300 + 'ms' : '',
                  'transition-property': !!this.allowTransition ? 'max-height' : '',
                  'display': !!this.allowTransition ? 'block' : (this.model.opened ? 'block' : 'none')
              }
          }
      },
      watch: {
          isDragEnter (newValue) {
              if (newValue) {
                  this.$el.style.backgroundColor = this.dragOverBackgroundColor
              } else {
                  this.$el.style.backgroundColor = "inherit"
              }
          },
          data (newValue) {
              this.model = newValue
          },
          'model.opened': {
              handler: function (val, oldVal) {
                  this.onItemToggle(this, this.model)
                  this.handleGroupMaxHeight()
              },
              deep: true
          }
      },
      created () {
          this.model.visibleChildren = this.model[this.childrenFieldName] // .slice(0, 20)

          const self = this
          const events = {
              'click': this.handleItemClick,
              'mouseover': this.handleItemMouseOver,
              'mouseout': this.handleItemMouseOut
          }
          for (let itemEvent in this.itemEvents) {
              let itemEventCallback = this.itemEvents[itemEvent]
              if (events.hasOwnProperty(itemEvent)) {
                  let eventCallback = events[itemEvent]
                  events[itemEvent] = function (event) {
                      eventCallback(self, self.model, event)
                      itemEventCallback(self, self.model, event)
                  }
              } else {
                  events[itemEvent] = function (event) {
                      itemEventCallback(self, self.model, event)
                  }
              }
          }
          this.events = events
      },
      mounted () {
          this.$nextTick(function () {
            this.handleGroupMaxHeight()
            this.groupHeightCalculated = true
          })
      },
      methods: {
          handleDragStart($event, self, model) {
            this.isBeingDragged = true
            this.onItemDragStart($event, self, model)
          },
          handleDragEnd($event, self, model) {
            this.isBeingDragged = false
            this.onItemDragEnd($event, self, model)
          },
          handleDragEnter ($event, self, model) {
            this.isDragEnter = true
            this.dragOverCount += 1
          },
          handleDragLeave ($event, self, model) {
            this.isDragEnter = false
            this.dragOverCount -= 1
          },
          handleDragOver ($event, self, model) {
            if (this.isBeingDragged) {
              return
            }

            this.isDragEnter = true
            const targetRect = $event.target.getBoundingClientRect()
            const { clientX: mouseX, clientY: mouseY } = $event

            const nodeHeight = targetRect.bottom - targetRect.top

            const [ xInRect, yInRect ] = [
              mouseX - targetRect.left, 
              mouseY - targetRect.top
            ]

            const oneFourthNodeHeight = nodeHeight / 4
            const positionInTarget = {
              top: yInRect <= oneFourthNodeHeight,
              bottom: yInRect >= (nodeHeight -oneFourthNodeHeight)
            }

            if (positionInTarget.top) {
              this.isDraggingOverUpwards = true
              this.isDraggingOverDownwards = false
            } else if (positionInTarget.bottom) {
              this.isDraggingOverUpwards = false
              this.isDraggingOverDownwards = true
            } else {
              this.isDraggingOverUpwards = false
              this.isDraggingOverDownwards = false

              if (this.isFolder && !this.isDragOverFolderOpenScheduled && !this.model.opened) {
                this.openFolderForDrop()
              }
              // if this is a collection, and no open is scheduled - schedule
              // an open for after 1 second, and in the open check if the
              // cursor is still over the collection. If it is, then open the
              // the collection.
            }

            this.onItemDragOver($event, self, model)
          },
          openFolderForDrop () {
            this.isDragOverFolderOpenScheduled = true
            const node = this
            setTimeout(() => {
              node.handleItemToggle()
            }, this.onDragOverOpenFolderTimeout);
          },
          handleItemDrop (e, oriNode, oriItem) {
              this.$el.style.backgroundColor = "inherit"
              // Used to specify wether we are reordering items on the same
              // level. So wether we want to put the dragged item before or
              // after the current item.
              const reorder = {
                before: false,
                after: false,
                // id: this.data.id,
                // node: this
              }

              if (this.isDraggingOverUpwards) {
                reorder.before = true
              } else if (this.isDraggingOverDownwards) {
                reorder.after = true
              }

              this.resetDragOverState()

              this.onItemDrop(e, oriNode, oriItem, reorder)
          },
          resetDragOverState () {
            let currentNode = this
            while (currentNode && currentNode.isTreeNode === true) {
              currentNode.isDragOverFolderOpenScheduled = false
              currentNode.isDraggingOverUpwards = false
              currentNode.isDraggingOverDownwards = false
              currentNode.dragOverCount = 0
              currentNode.isDragEnter = false

              currentNode = currentNode.parentTreeNode            
            }
          },
          handleItemToggle (e) {
              if (this.isFolder) {
                  this.model.opened = !this.model.opened
                  this.onItemToggle(this, this.model)
              }
          },
          handleGroupMaxHeight () {
            console.log(this)
              if (!!this.allowTransition) {
                  let length = 0
                  let childHeight = 0
                  if (this.model.opened) {
                      length = this.$children.length
                      for (let children of this.$children) {
                          childHeight += children.maxHeight || 0
                      }
                  }
                  this.maxHeight = length * this.height + childHeight
                  if (this.$parent.$options._componentTag === 'tree-item') {
                      this.$parent.handleGroupMaxHeight()
                  }
              }
          },
          handleItemClick (e) {
              if (this.model.disabled) return
              this.model.selected = !this.model.selected
              this.onItemClick(this, this.model, e)
          },
          handleItemMouseOver () {
              this.isHover = true
          },
          handleItemMouseOut () {
              this.isHover = false
          },
      }
  }
</script>
