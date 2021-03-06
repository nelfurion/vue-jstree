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
    @click.stop.prevent="handleItemToggleClick"
  >
    <div
      v-if="isWholeRow"
      role="presentation"
      :class="wholeRowClasses"
    >
&nbsp;
    </div>
    <i
      ref="iconToggle"
      :class="{'hidden': !this.model.opened}"
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
    <div
      class="tree-children-container"
    >
      <ul
        v-if="isFolder && model.opened"
        ref="group"
        role="group"
        class="tree-children"
        :style="groupStyle"
      >
        <li
          v-if="allowsDrop"
          class="tree-item js-tree-position-placeholder js-tree-position-before-children"
          :bookmark-id="model.id"
          @dragover="() => {}"
          @drop.stop.prevent="handleItemDropOnPositionPlaceHolder($event, $refs[`child-0`][0], itemsToShow[0], true, false)"
        />
        <template v-for="(child, index) in itemsToShow">
          <tree-item
            :ref="`child-${index}`"
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
            :allows-drop="allowsDrop"
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
          <li
            v-if="allowsDrop"
            :key="`child-${index}-position-after`"
            class="tree-item js-tree-position-placeholder js-tree-position-after"
            :bookmark-id="child.id"
            @dragover="() => {}"
            @drop.stop.prevent="handleItemDropOnPositionPlaceHolder($event, $refs[`child-${index}`][0], child, false, true)"
          />
        </template>
      </ul>
      <LoadMore
        v-if="model.opened && hasMoreItemsToShow"
        @click="showMore"
      />
      <ReachedEnd
        v-if="model.opened && !hasMoreItemsToShow"
        :folder-name="model[textFieldName]"
      />
    </div>
  </li>
</template>
<script lang="js">
import LoadMore from './load-more.vue'
import ReachedEnd from './reached-end.vue'

import throttle from 'lodash.throttle'

  export default {
      name: 'TreeItem',
      components: {
        LoadMore,
        ReachedEnd
      },
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
          allowsDrop: { type: Boolean, default: false },
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
          events: {},
          itemsToShowPerPage: 30,
          itemsToShowPage: 1,
          lastVisiblePlaceholder: null
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
                  'transition-duration': !!this.allowTransition ? Math.ceil(this.itemsToShow.length / 100) * 300 + 'ms' : '',
                  'transition-property': !!this.allowTransition ? 'max-height' : '',
                  'display': !!this.allowTransition ? 'block' : (this.model.opened ? 'block' : 'none')
              }
          },
          shouldShowBackgroundColor () {
            return !!this.dragPositionInTarget.verticalCenter
          },
          itemsToShow () {
            return this.model[this.childrenFieldName].slice(0, this.itemsToShowPage * this.itemsToShowPerPage)
          },
          hasMoreItemsToShow () {
            return this.itemsToShowPage * this.itemsToShowPerPage < this.model[this.childrenFieldName].length
          }
      },
      watch: {
          dragPositionInTarget (newValue) {
            // If dragging inside a folder - hide the position just below the 
            // folder.
            if (this.model.opened) {
              this.hideBelowPlaceholder()
            }

            if (this.allowsDrop) {
              if (newValue.verticalCenter && this.model.type === 'folder') {
                this.$el.style.backgroundColor = this.dragOverBackgroundColor
              } else {
                this.$el.style.backgroundColor = "inherit"
              }

              if (newValue.top) {
                this.hideAllPlaceHoldersExcept(this.$el.previousElementSibling)
                this.showAbovePlaceholder()

                this.hideChildrenPositionPlaceholders({ target: this.$el })
              } else if (newValue.bottom) {
                this.hideAllPlaceHoldersExcept(this.$el.nextElementSibling)

                // Show the position below the current item, unless the current
                // item is an opened folder.
                if (!this.model.opened) {
                  this.showBelowPlaceholder()
                }
              }

              // In order to hide the placeholders when the user is draggin 
              // in the vertical center of the folder. However we don't want
              // to remove them with display none, as that will jiggle the 
              // elements in the tree, and change their positions.
              if (newValue.verticalCenter && this.isFolder) {
                this.$el.nextElementSibling.style.visibility = 'hidden'
                this.$el.previousElementSibling.style.visibility = 'hidden'
              } else {
                this.$el.nextElementSibling.style.visibility = 'visible'
                this.$el.previousElementSibling.style.visibility = 'visible'
              }
            }

            // if (newValue.mouseTreePosition.fromTop > 0 && newValue.mouseTreePosition.fromTop < 1000) {
            //   console.log('< 1000')
            //   window.scrollBy({ top: -50, left: 0, behavior: 'smooth' })
            // } else if (newValue.mouseTreePosition.fromBottom > 0 && newValue.mouseTreePosition.fromBottom < 200) {
            //   window.scrollBy({ top: 50, left: 0, behavior: 'smooth' })
            // }
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
          showAbovePlaceholder () {
            if (this.allowsDrop) {
              this.lastVisiblePlaceholder = 'above'
              this.$el.previousElementSibling.style.height = `${this.height}px`
              this.$el.previousElementSibling.classList.add('js-tree-position-placeholder__visible')
            }
          },
          showBelowPlaceholder () {
            if (this.allowsDrop) {
              this.lastVisiblePlaceholder = 'below'
              this.$el.nextElementSibling.style.height = `${this.height}px`
              this.$el.nextElementSibling.classList.add('js-tree-position-placeholder__visible')
            }
          },
          hideAllPlaceHoldersExcept(skipped) {
            const self = this
            Array.from(document.querySelectorAll('.js-tree-position-placeholder__visible'))
              .forEach(element => {
                if (!element.isSameNode(skipped) && self.allowsDrop) {
                  element.classList.remove('js-tree-position-placeholder__visible')
                  element.style.height = `0px`
                }
              })
          },
          // This one is needed to hide specifically the below placeholder exactly
          // when the folder is opened.
          hideBelowPlaceholder () {
            if (this.allowsDrop) {
              this.$el.nextElementSibling.style.height = `0px`
              this.$el.nextElementSibling.classList.remove('js-tree-position-placeholder__visible')
            }
          },
          // hideAbovePlaceholder () {
          //   Array.from(document.querySelectorAll('.js-tree-position-placeholder__visible'))
          //     .forEach(element => {
          //       element.classList.remove('js-tree-position-placeholder__visible')
          //       element.style.height = `0px`
          //     })

          //   this.$el.previousElementSibling.style.height = `0px`
          //   this.$el.previousElementSibling.classList.remove('js-tree-position-placeholder__visible')
          // },
          showMore () {
            this.itemsToShowPage++
          },
          handleDragStart($event, self, model) {
            this.isBeingDragged = true
            this.onItemDragStart($event, self, model)
          },
          handleDragEnd($event, self, model) {
            this.isBeingDragged = false
            this.resetDragOverStateBubble()
            this.onItemDragEnd($event, self, model)
          },
          handleDragEnter: throttle(($event, self, model) => {
            self.getDragoverPosition($event)
            if (self.dragPositionInTarget.inside) {
              self.isDragEnter = true
            }

            self.dragOverCount += 1
          }, 100),
          handleDragLeave: throttle(($event, self, model) => {
            // If we press escape while hovering over a folder, there is a chance
            // that we will set the background just after drag ends, but we also
            // always receive dragleave at that point, so here we make sure the
            // background disappears.
            setTimeout(() => {
              self.$el.style.backgroundColor = "inherit"
            }, 120);

            self.hideChildrenPositionPlaceholders($event)

            self.getDragoverPosition($event)
            if (!self.dragPositionInTarget.inside) {
              self.isDragEnter = false
            }

            // This should be inside otherwise dragging out of fodlers
            // does not work. - E.g. draggin something from a fodler, under
            // the last folder in the root level.
            if (self.dragOverCount === 0) {
              self.resetDragOverStateBubble()
            }

            if (self.dragOverCount) {
              self.dragOverCount -= 1
            }
          }, 100),
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

            const oneThirdNodeHeight = this.height / 4

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
            this.onDragOverThrottled($event, self, model, this)
          },
          onDragOverThrottled: throttle(($event, self, model) => {
              if (self.isBeingDragged) {
                return
              }

              self.getDragoverPosition($event)
              if (self.dragPositionInTarget.inside) {
                self.isDragEnter = true
              }

              if (self.dragPositionInTarget.topLeft && self.isFolder && self.model.opened && !self.isCloseFolderScheduled) {
                self.closeScheduleFolder()
              } else {
                if (self.dragPositionInTarget.verticalCenter && !self.dragPositionInTarget.topLeft && self.isFolder && !self.isDragOverFolderOpenScheduled && !self.model.opened) {
                  // if this is a collection, and no open is scheduled - schedule
                  // an open for after 1 second, and in the open check if the
                  // cursor is still over the collection. If it is, then open the
                  // the collection.
                  self.openFolderForDrop()
                }
              }

              self.onItemDragOver($event, self, model)
            }, 
            100, 
            {
              leading: true
            }
          ),
          openFolderForDrop () {
            this.isDragOverFolderOpenScheduled = true
            const node = this
            setTimeout(() => {
              // if we schedule the open but then our cursor leaves and reenters
              // the folder, we may accidentally schedule the opening several
              // times
              if (this.dragPositionInTarget.verticalCenter && !this.model.opened) {
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
            setTimeout(() => {
              this.$el.style.backgroundColor = "inherit"
            }, 120);

            if (this.allowsDrop) {
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

              const position = JSON.parse(JSON.stringify(this.dragPositionInTarget))

              if (!(this.dragPositionInTarget.verticalCenter && this.isFolder)) {
                if (this.isDraggingOverUpwards || (this.lastVisiblePlaceholder === 'above' && !this.model.opened)) {
                  reorder.before = true
                } else if (this.isDraggingOverDownwards || (this.lastVisiblePlaceholder === 'below' && !this.model.opened)) {
                  reorder.after = true
                }
              }

              this.resetDragOverStateBubble()

              this.onItemDrop(e, oriNode, oriItem, reorder)
            }
          },
          handleItemDropOnPositionPlaceHolder (e, oriNode, oriItem, isBefore, isAfter) {
            if (this.allowsDrop) {
              setTimeout(() => {
                this.$el.style.backgroundColor = "inherit"
              }, 120);
              // dragOverCount is outside of resetDragOverState, because
              // we want to reset everything else on drag leave, but not the
              // dragOverCount, as lets us know if we should open a folder or not.
              // The dragLeave event is fired for all child dom elements of each 
              // node.
              this.dragOverCount = 0
              this.resetDragOverStateBubble()

              const reorder = {
                before: isBefore,
                after: isAfter,
              }

              this.onItemDrop(e, oriNode, oriItem, reorder)
            }
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

            this.hideAllPlaceHoldersExcept(null)
          },
          handleItemToggle () {
              if (this.isFolder) {
                  this.model.opened = !this.model.opened
                  this.onItemToggle(this, this.model)
                  if (!this.model.opened) {
                    this.itemsToShowPage = 1
                  }
              }
          },
          handleItemToggleClick (event) {
            const childrenList = this.$el.querySelector('.tree-children-container')
            let clickIsInsideChildrenList = false
            if (childrenList) {
              const childrenListRect = childrenList.getBoundingClientRect()
              const insideRectX = event.clientX >= childrenListRect.left && event.clientX <= childrenListRect.right
              const insideRectY = event.clientY >= childrenListRect.top  && event.clientY <= childrenListRect.bottom
              clickIsInsideChildrenList = insideRectX && insideRectY
            }

            // If we have clicked on the list element for this tree item but
            // not inside it's children.
            if (!childrenList || !clickIsInsideChildrenList) {
              this.handleItemToggle()
            }
          },
          hideChildrenPositionPlaceholders ($event) {
            // If we are dragleaving the whole tree node
            if ($event.target.isSameNode(this.$el) && this.model.opened) {
              const childrenList = this.$el.querySelector('.tree-children')
              const childrenPositionPlaceholders = Array.from(childrenList.querySelectorAll('.js-tree-position-placeholder'))
              const self = this
              childrenPositionPlaceholders.forEach(placeholder => {
                if (self.allowsDrop) {
                  placeholder.style.height = `0px`
                  placeholder.classList.remove('js-tree-position-placeholder__visible') 
                }
              })
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

                  this.maxHeight += (this.height + paddingTop + paddingBottom)

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
