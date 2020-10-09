<template>
  <li
    role="treeitem"
    :class="classes"
    class="tree-item"
    :draggable="draggable"
    @dragstart.stop="handleDragStart($event, _self, _self.model)"
    @dragend.stop.prevent="handleDragEnd($event, _self, _self.model)"
    @dragover.stop.prevent="handleDragOver($event, _self, _self.model)"
    @dragenter.stop.prevent="handleDragEnter($event, _self, _self.model)"
    @dragleave.stop.prevent="handleDragLeave($event, _self, _self.model)"
    @drop.stop.prevent="handleItemDrop($event, _self, _self.model)"
    @click.stop.prevent="handleItemToggle"
  >
    <div
      v-if="isWholeRow"
      role="presentation"
      :class="wholeRowClasses"
    >
&nbsp;
    </div>
    <i
      :class="{'hidden': !this.model.opened}"
      ref="iconToggle"
      class="tree-icon tree-ocl"
      role="presentation"
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
      <li class="tree-item js-tree-position-placeholder js-tree-position-before-children" :bookmark-id="model.id"></li>
      <template v-for="(child, index) in model[childrenFieldName]">
        <tree-item
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
        <li class="tree-item js-tree-position-placeholder js-tree-position-after" :bookmark-id="child.id"></li>
      </template>
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
          height: {type: Number, required: true},
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
              dragPositionInTarget: {},
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
          },
          shouldShowBackgroundColor () {
            return !!this.dragPositionInTarget.verticalCenter
          }
      },
      watch: {
          dragPositionInTarget (newValue) {
            if (newValue.verticalCenter && this.model.type === 'folder') {
              this.$refs.iconToggle.style.backgroundColor = "lightgrey"
              this.$el.style.backgroundColor = this.dragOverBackgroundColor
            } else {
              this.$refs.iconToggle.style.backgroundColor = "inherit"
              this.$el.style.backgroundColor = "inherit"
            }

            if (newValue.top) {
                this.$el.previousElementSibling.style.background = "black"
                this.$el.previousElementSibling.style.backgroundColor = "black"
                this.$el.nextElementSibling.style.background = "transparent"
              } else if (newValue.bottom) {
                this.$el.previousElementSibling.style.background = "transparent"
                this.$el.nextElementSibling.style.background = "black"
              } else {
                this.$el.previousElementSibling.style.background = "transparent"
                this.$el.nextElementSibling.style.background = "transparent"
              }

            if (newValue.mouseTreePosition.fromTop > 0 && newValue.mouseWindowPosition.fromTop < 50) {
              window.scrollBy({ top: -50, left: 0, behavior: 'smooth' })
            } else if (newValue.mouseTreePosition.fromBottom > 0 && newValue.mouseWindowPosition.fromBottom < 50) {
              window.scrollBy({ top: 50, left: 0, behavior: 'smooth' })
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
          const self = this
          const events = {
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
            this.getDragoverPosition($event)
            if (this.dragPositionInTarget.inside) {
              this.isDragEnter = true
            }

            this.dragOverCount += 1
          },
          handleDragLeave ($event, self, model) {
            this.getDragoverPosition($event)
            if (!this.dragPositionInTarget.inside) {
              this.isDragEnter = false
            }

            // This should be inside otherwise dragging out of fodlers
            // does not work. - E.g. draggin something from a fodler, under
            // the last folder in the root level.
            if (this.dragOverCount === 0) {
              this.resetDragOverStateBubble()
            }

            if (this.dragOverCount) {
              this.dragOverCount -= 1
            }
          },
          getDragoverPosition ($event) {
            this.dragPositionInTarget = this.calculateDragPositionInTarget($event)

            if (this.dragPositionInTarget.top) {
              this.isDraggingOverUpwards = true
              this.isDraggingOverDownwards = false
            } else if (this.dragPositionInTarget.bottom) {
              this.isDraggingOverUpwards = false
              this.isDraggingOverDownwards = true
            } else {
              this.isDraggingOverUpwards = false
              this.isDraggingOverDownwards = false
            }

            return this.dragPositionInTarget
          },
          calculateDragPositionInTarget ($event) {
            // the 24th pixel is the width of the +/- icon
            // it is used to determine wether we want to close the folder we 
            // are dragging over
            const leftPixelThreshold = 24
            const targetRect = this.$el.getBoundingClientRect()
            const treeRect = document.querySelector('div[role="tree"]').getBoundingClientRect()
            const { clientX: mouseX, clientY: mouseY } = $event

            const [ xInRect, yInRect ] = [
              mouseX - targetRect.left, 
              mouseY - targetRect.top
            ]

            const oneThirdNodeHeight = this.height / 3

            const dragPositionInTarget = {
              mouseWindowPosition: {
                x: mouseX,
                y: mouseY,
                fromBottom: window.innerHeight - mouseY,
                fromTop: mouseY
              },
              mouseTreePosition: {
                x: mouseX - treeRect.left,
                y: mouseY - treeRect.top,
                fromBottom: treeRect.bottom - mouseY,
                fromTop: mouseY - treeRect.top
              },
              inside: yInRect <= this.height,
              verticalCenter: yInRect > oneThirdNodeHeight && yInRect < (this.height - oneThirdNodeHeight),
              top: yInRect <= oneThirdNodeHeight,
              bottom: yInRect >= (this.height -oneThirdNodeHeight) && yInRect <= this.height,
              left: xInRect <= leftPixelThreshold
            }

            dragPositionInTarget.topLeft = dragPositionInTarget.inside && dragPositionInTarget.left

            return dragPositionInTarget
          },
          handleDragOver ($event, self, model) {
            if (this.isBeingDragged) {
              return
            }

            this.getDragoverPosition($event)
            if (this.dragPositionInTarget.inside) {
              this.isDragEnter = true
            }

            if (this.dragPositionInTarget.topLeft && this.isFolder && this.model.opened && !this.isCloseFolderScheduled) {
              this.closeScheduleFolder()
            } else {
              if (this.dragPositionInTarget.verticalCenter && !this.dragPositionInTarget.topLeft && this.isFolder && !this.isDragOverFolderOpenScheduled && !this.model.opened) {
                 // if this is a collection, and no open is scheduled - schedule
                // an open for after 1 second, and in the open check if the
                // cursor is still over the collection. If it is, then open the
                // the collection.
                this.openFolderForDrop()
              }
            }

            
            this.onItemDragOver($event, self, model)
          },
          openFolderForDrop () {
            this.isDragOverFolderOpenScheduled = true
            const node = this
            setTimeout(() => {
              // if we schedule the open but then our cursor leaves and reenters
              // the folder, we may accidentally schedule the opening several
              // times
              if (node.dragOverCount > 0 && !this.model.opened) {
                node.handleItemToggle()
              }

              this.isDragOverFolderOpenScheduled = false              
            }, this.onDragOverOpenFolderTimeout);
          },
          closeScheduleFolder () {
            this.isCloseFolderScheduled = true
            const node = this
            setTimeout(() => {
              // in case we accidentally schedule the close several times
              if (this.model.opened) {
                node.handleItemToggle()
              }
              
              this.isCloseFolderScheduled = false
            }, this.onDragOverOpenFolderTimeout);
          },
          handleItemDrop (e, oriNode, oriItem) {
            this.$el.style.backgroundColor = "inherit"
            // dragOverCount is outside of resetDragOverState, because
            // we want to reset everything else on drag leave, but not the
            // dragOverCount, as lets us know if we should open a folder or not.
            // The dragLeave event is fired for all child dom elements of each 
            // node.
            this.dragOverCount = 0
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

            this.resetDragOverStateBubble()

            this.onItemDrop(e, oriNode, oriItem, reorder)
          },
          resetDragOverState (node) {
            node.isDragOverFolderOpenScheduled = false
            node.isCloseFolderScheduled = false
            node.isDraggingOverUpwards = false
            node.isDraggingOverDownwards = false
            node.isDragEnter = false
          },
          resetDragOverStateBubble () {
            let currentNode = this
            while (currentNode && currentNode.isTreeNode === true) {
              this.resetDragOverState(currentNode)

              currentNode = currentNode.parentTreeNode            
            }

            const positionPlaceholders = 
              document.querySelectorAll('.js-tree-position-placeholder')

            for (const placeholder of positionPlaceholders) {
              placeholder.style.background = "transparent"
            }
          },
          handleItemToggle (e) {
              if (this.isFolder) {
                  this.model.opened = !this.model.opened
                  this.onItemToggle(this, this.model)
              }
          },
          handleGroupMaxHeight () {
              if (!!this.allowTransition) {
                  let length = 0
                  let childrenHeight = 0
                  if (this.model.opened) {
                      length = this.$children.length
                      for (let child of this.$children) {
                          childrenHeight += child.maxHeight || 0
                      }
                  }

                  const styles = window.getComputedStyle(this.$el)
                  const paddingTop = Number(styles.paddingTop.split('px')[0])
                  const paddingBottom = Number(styles.paddingBottom.split('px')[0])

                  this.maxHeight = length * (this.height + paddingTop + paddingBottom) + childrenHeight
                  this.maxHeight += length + 1 // position placeholders

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
