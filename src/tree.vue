<template>
  <div
    :class="classes"
    role="tree"
    onselectstart="return false"
    @dragleave.self.prevent.stop="onDragLeaveTree($event)"
  >
    <ul
      :class="containerClasses"
      role="group"
    >
      <li
        v-if="allowsDrop"
        class="tree-item js-tree-position-placeholder js-tree-position-before-children"
        :bookmark-id="data.id"
        @dragover="() => {}"
        @drop.stop.prevent="$refs[`child-0`][0].handleItemDropOnPositionPlaceHolder($event, $refs[`child-0`][0], itemsToShow[0], true, false)"
      />
      <template v-for="(child, index) in itemsToShow">
        <tree-item
          :ref="`child-${index}`"
          :key="index"
          class="tree-item tree-item-toplevel"
          :data="child"
          :text-field-name="textFieldName"
          :value-field-name="valueFieldName"
          :children-field-name="childrenFieldName"
          :item-events="itemEvents"
          :whole-row="wholeRow"
          :show-checkbox="showCheckbox"
          :allow-transition="allowTransition"
          :height="sizeHeight"
          :parent-item="data"
          :draggable="draggable"
          :allows-drop="allowsDrop"
          :drag-over-background-color="dragOverBackgroundColor"
          :on-item-click="onItemClick"
          :on-item-toggle="onItemToggle"
          :on-item-drag-start="onItemDragStart"
          :on-item-drag-over="onItemDragOver"
          :on-drag-over-open-folder-timeout="onDragOverOpenFolderTimeout"
          :on-item-drag-end="onItemDragEnd"
          :on-item-drop="onItemDrop"
          :klass="index === data.length-1?'tree-last':''"
          :parent-tree-node="null"
        >
          <template slot-scope="_">
            <slot
              :vm="_.vm"
              :model="_.model"
            >
              <i
                v-if="!_.model.loading"
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
          @drop.stop.prevent="$refs[`child-${index}`][0].handleItemDropOnPositionPlaceHolder($event, $refs[`child-${index}`][0], child, false, true)"
        />
      </template>
    </ul>
    <LoadMore
      v-if="hasMoreItemsToShow"
      @click="showMore"
    />
  </div>
</template>
<script lang="js">
import treeSearch from 'tree-search'
import crawl from 'tree-crawl'
import TreeItem from "./tree-item.vue";
import LoadMore from './load-more.vue'
import { Item } from './item.js'

let ITEM_HEIGHT_SMALL = 18;
let ITEM_HEIGHT_DEFAULT = 24;
let ITEM_HEIGHT_LARGE = 32;

export default {
  name: "VJstree",
  components: {
    TreeItem,
    LoadMore
  },
  props: {
    data: { type: Array },
    size: {
      type: String,
      validator: value => ["large", "small"].indexOf(value) > -1
    },
    showCheckbox: { type: Boolean, default: false },
    wholeRow: { type: Boolean, default: false },
    noDots: { type: Boolean, default: false },
    collapse: { type: Boolean, default: false },
    multiple: { type: Boolean, default: false },
    allowBatch: { type: Boolean, default: false },
    allowTransition: { type: Boolean, default: true },
    textFieldName: { type: String, default: "text" },
    valueFieldName: { type: String, default: "value" },
    childrenFieldName: { type: String, default: "children" },
    itemEvents: {
      type: Object,
      default: function() {
        return {};
      }
    },
    async: { type: Function },
    loadingText: { type: String, default: "Loading..." },
    draggable: { type: Boolean, default: false },
    allowsDrop: { type: Boolean, default: false },
    onDropBeforeAdd: { type: Function, default: () => {} },
    dragOverBackgroundColor: { type: String, default: "#C9FDC9" },
    onDragOverOpenFolderTimeout: { type: Number, default: 500 },
    klass: String
  },
  data() {
    return {
      draggedItem: undefined,
      draggedElm: undefined,
      itemsToShowPerPage: 30,
      itemsToShowPage: 1
    };
  },
  computed: {
    classes() {
      return [
        { tree: true },
        { "tree-default": !this.size },
        { [`tree-default-${this.size}`]: !!this.size },
        { "tree-checkbox-selection": !!this.showCheckbox },
        { [this.klass]: !!this.klass }
      ];
    },
    containerClasses() {
      return [
        { "tree-container-ul": true },
        { "tree-children": true },
        { "tree-wholerow-ul": !!this.wholeRow },
        { "tree-no-dots": !!this.noDots }
      ];
    },
    sizeHeight() {
      switch (this.size) {
        case "large":
          return ITEM_HEIGHT_LARGE;
        case "small":
          return ITEM_HEIGHT_SMALL;
        default:
          return ITEM_HEIGHT_DEFAULT;
      }
    },
    itemsToShow () {
      return this.data.slice(0, this.itemsToShowPage * this.itemsToShowPerPage)
    },
    hasMoreItemsToShow () {
      return this.itemsToShowPage * this.itemsToShowPerPage < this.data.length
    }
  },
  watch: {
    data: function (val) {
      this.initializeData(val)
    }
  },
  created() {
    this.initializeData(this.data);
  },
  mounted() {
    if (this.async) {
      this.$set(this.data, 0, this.initializeLoading());
      this.handleAsyncLoad(this.data, this);
    }
  },
  methods: {
    showMore () {
      this.itemsToShowPage++
    },
    findTreeItem (id) {
      const find = treeSearch(this.childrenFieldName)
      return find(this.data, 'id', id)
    },
    initializeData(items, parent) {
      return Item.initializeData(
        items, 
        parent, 
        this.textFieldName,
        this.valueFieldName,
        this.childrenFieldName,
        this.collapse
      )
    },
    initializeDataItem(item, parentId) {
      
      return Item.initializeDataItem(
        item, 
        parentId, 
        this.textFieldName,
        this.valueFieldName,
        this.childrenFieldName,
        this.collapse
      )
    },
    initializeLoading() {
      var item = {};
      item[this.textFieldName] = this.loadingText;
      item.disabled = true;
      item.loading = true;
      return this.initializeDataItem(item);
    },
    handleRecursionNodeChilds(node, func) {
      if (func(node) !== false) {
        if (node.$children && node.$children.length > 0) {
          for (let childNode of node.$children) {
            if (!childNode.disabled) {
              this.handleRecursionNodeChilds(childNode, func);
            }
          }
        }
      }
    },
    onDragLeaveTree(event) {
      Array.from(this.$el.querySelectorAll('.js-tree-position-placeholder'))
        .forEach(placeholder => {
          placeholder.style.height = '0px'
          placeholder.classList.remove('js-tree-position-placeholder__visible')
        });
    },
    onItemClick(oriNode, oriItem, e) {
      if (this.multiple) {
        if (this.allowBatch) {
          this.handleBatchSelectItems(oriNode, oriItem);
        }
      } else {
        this.handleSingleSelectItems(oriNode, oriItem);
      }
      this.$emit("item-click", oriNode, oriItem, e);
    },
    handleSingleSelectItems(oriNode, oriItem) {
      this.handleRecursionNodeChilds(this, node => {
        if (node.model) node.model.selected = false;
      });
      oriNode.model.selected = true;
    },
    handleBatchSelectItems(oriNode, oriItem) {
      this.handleRecursionNodeChilds(oriNode, node => {
        if (node.model.disabled) return;
        node.model.selected = oriNode.model.selected;
      });
    },
    onItemToggle(oriNode, oriItem, e) {
      if (oriNode.model.opened) {
        this.handleAsyncLoad(
          oriNode.model[this.childrenFieldName],
          oriNode,
          oriItem
        );
      }
      this.$emit("item-toggle", oriNode, oriItem, e);
    },
    handleAsyncLoad(oriParent, oriNode, oriItem) {
      var self = this;
      if (this.async) {
        if (oriParent[0].loading) {
          this.async(oriNode, data => {
            if (data.length > 0) {
              for (let i in data) {
                if (!data[i].isLeaf) {
                  if (typeof data[i][self.childrenFieldName] !== "object") {
                    data[i][self.childrenFieldName] = [
                      self.initializeLoading()
                    ];
                  }
                }
                var dataItem = self.initializeDataItem(data[i]);
                self.$set(oriParent, i, dataItem);
              }
            } else {
              oriNode.model[self.childrenFieldName] = [];
            }
          });
        }
      }
    },
    onItemDragStart(e, oriNode, oriItem) {
      if (!this.draggable || oriItem.dragDisabled) return false;
      e.dataTransfer.effectAllowed = "move";
      e.dataTransfer.setData("text", null);

      e.dataTransfer.items.add(
        JSON.stringify(oriItem), 
        'text/json'
      )

      this.draggedElm = e.target;
      this.draggedItem = {
        node: oriNode,
        item: oriItem,
        parentItem: oriNode.parentItem,
      };

      this.$emit("item-drag-start", oriNode, oriItem, e);
    },
    onItemDragOver(e, target, targetModel) {
      const targetRect = e.target.getBoundingClientRect()
      const { clientX: mouseX, clientY: mouseY } = e

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

      if (this.draggedItem) {
        this.$emit("item-drag-over", {
          target, 
          targetModel, 
          positionInTarget, 
          event: e,
          draggedItem: this.draggedItem.item
        })
      }
    },
    onItemDragEnd(e, oriNode, oriItem) {
      this.draggedItem = undefined;
      this.draggedElm = undefined;
      this.$emit("item-drag-end", oriNode, oriItem, e);
    },
    async onItemDrop(e, oriNode, oriItem, reorder) {
      const dataIsUpdated = false
      if (!this.draggable || !!oriItem.dropDisabled) {
        return false
      }

      this.$emit(
        "item-drop-before",
        oriNode,
        oriItem,
        !this.draggedItem ? undefined : this.draggedItem.item,
        e
      )

      // Other things like the text of the dragged item are added automatically
      // to the dataList, and the order is not promised.
      let eventData = null
      for (const item of e.dataTransfer.items) {
        if (item.type === 'text/json' && item.kind === 'string') {
          // The promise is needed, because the getAsString requires a callback
          eventData = await new Promise((resolve, reject) => {
            item.getAsString((data) => {
              resolve(JSON.parse(data))
            })
          })
        }
      }

      if (
        (!this.draggedElm || this.draggedElm === e.target) &&
        !eventData
      ) {
        return
      }

      // Lets put the eventData in the this.draggedItem so we change as little
      // code below as possible.
      if (eventData) {
        // In case we are dragging an item between vue-jstrees splicing the 
        // parentItem from the eventData will remove the item from the source
        // when adding it to the destination tree. This will work even when 
        // reordering items in the same tree.
        let parentItem = null

        if (eventData.parentId === 'root') {
          parentItem = this.data
        } else if (eventData.parentId) {
          parentItem = this.findTreeItem(eventData.parentId)
          parentItem = parentItem ? parentItem[this.childrenFieldName] : null
        }

        this.draggedItem = {
          index: parentItem ? parentItem.findIndex(t => t.id === eventData.id) : null,
          item: this.initializeDataItem(eventData, eventData.parentId),
          parentItem,
        }
      }

      if (this.draggedItem) {
        if (
          !eventData &&
          (
            this.draggedItem.parentItem === oriItem[this.childrenFieldName] ||
            (oriItem[this.childrenFieldName] &&
              oriItem[this.childrenFieldName].findIndex(
                t => t.id === this.draggedItem.item.id
              ) !== -1)
          )
        ) {
          return
        }

        // Return if we are dragging an item next to / over itself.
        if (this.draggedItem.item === oriItem) {
          return
        }

        // Return if we are dragging next to an item that is a child of the
        // dragged item - aka dragging the item into itself.
        if (this.isChildOf(oriItem, this.draggedItem.item)) {
          return
        }

        // oriItem is the drop target node's data - addBefore/After are defined here
        // oriNode is the drop target node - node.parentItem is defined here
        // Since dragover reordering works by adding paddings over / under nodes,
        // the target is the node that we want to pass to addBefore/addAfter.
        // The addBefore and addAfter functions seem to be static functions, and
        // there doesn't appear to be any need for them to be called on a specific
        // node.
        await this.addDraggedItem(this.draggedItem, oriItem, oriNode, reorder)
      }
    },
    /**
      itemDescription = {
        item: {},
        index: Number
      }
    */
    async addDraggedItem (draggedItemDescription, dropTargetData, dropTargetNode, reorder) {
      if (dropTargetData.id === draggedItemDescription.item.id) {
        // We are dropping the same item over / under / inside itself
        return
      }

      let action = null
      if (reorder.before) {
        action = 'addBefore'
      } else if (reorder.after) {
        action = 'addAfter'
      } else {
        action = 'addChild'
        if (!this.isFolder(dropTargetData)) {
          return
        }
        
        dropTargetData.opened = true
      }

      draggedItemDescription.item = await this.onDropBeforeAdd(draggedItemDescription, dropTargetData, action)
      this.$nextTick(() => {
        this.addWithoutDuplicates(action, draggedItemDescription, dropTargetData, dropTargetNode)
      })
    },
    addWithoutDuplicates (action, draggedItemDescription, dropTargetData, dropTargetNode) {
      // If the dragged item has a parent item and that parent item
        // has the draggedItem - e.g. this will always be true for items
        // dragged in their own tree, but may not be true for items dragged
        // to different trees.
        this.removeItemFromArray(
          draggedItemDescription.parentItem, 
          draggedItemDescription
        )

        // We also need to remove the dropped item from the target destination
        // if it already exists there. This can happen if e.g. we are moving
        // a node from the root of one tree to a folder in another tree, and
        // we try to repeat that action several times.
        if (action === 'addChild') { 
          // remove from the target's children before adding it there
          this.removeItemFromArray(
            dropTargetData[this.childrenFieldName], 
            draggedItemDescription
          )

          const newItem = dropTargetData.addChild(draggedItemDescription.item)
          this.$emit('update:add-child', dropTargetData.id, newItem)
          
        } else if (action === 'addBefore') {
          // remove from target's parent before adding it next to the target
          this.removeItemFromArray(
            dropTargetNode.parentItem, 
            draggedItemDescription
          )

          const newItem = dropTargetData.addBefore(draggedItemDescription.item, dropTargetNode)
          this.$emit('update:add-before', dropTargetData.id, newItem)
          
        } else if (action === 'addAfter') {
          // remove from target's parent before adding it next to the target
          this.removeItemFromArray(
            dropTargetNode.parentItem, 
            draggedItemDescription
          )

          const newItem = dropTargetData.addAfter(draggedItemDescription.item, dropTargetNode)
          this.$emit('update:add-after', dropTargetData.id, newItem)
        }
    },
    /**
     * Only call this if rendering another tree with the same data, and not using
     * a store to sync the data automatically.
     * @param {VueJSTree Item} itemToUpdate the updated item
     * @param {VueJSTree Item} updateTargetId the target of the update - the item before, item after, or parent of the updated item
     * @param {String} updateFunc // addBefore or addAfter or addChild
     */
    syncTreeItem ({ updateFunc: action, item: itemToUpdate, updateTargetId }) {
      const item = itemToUpdate.item
      const itemInTree = this.findTreeItem(itemToUpdate.id)
      const updateTarget = this.findTreeItem(updateTargetId)

      let updateTargetNode = { parentItem: this.data }
      const updateTargetParent = this.findTreeItem(updateTarget.parentId)
      if (updateTargetParent) {
        updateTargetNode = { parentItem: updateTargetParent.children }
      }

      if (itemInTree) {
        // TODO: if necessary update the .opened value here
        this.removeItem(itemInTree)
        // we try to repeat that action several times.
        if (action === 'addChild') { 
          updateTarget.addChild(itemToUpdate)
        } else if (action === 'addBefore') {
          updateTarget.addBefore(itemToUpdate, updateTargetNode)
        } else if (action === 'addAfter') {
          updateTarget.addAfter(itemToUpdate, updateTargetNode)
        }
      }
    },
    /**
      This is for legacy purposes.
      itemDescription = {
        item: {}, // the item
        index: Number // index of the iten in it's original parent
      }
    */
    removeItemFromArray (array, itemDescription) {
      if (array) {
        if (this.arrayHasItem(array, itemDescription.item)) {
          const index = array.map(i => i.id).indexOf(itemDescription.item.id)
          array.splice(index, 1)
        }
      }
    },
    removeItem (item) {
      const parent = this.findTreeItem(item.parentId)
      if (!parent) {
        this.removeItemFromArray(this.data, { item })
      } else {
        const index = parent.children.findIndex(t => t.id === item.id)
        parent.children.splice(index, 1)
      }
    },
    removeItemById (itemId) {
      const itemInTree = this.findTreeItem(itemId)
      this.removeItem(itemInTree)
    },
    // In the future, the isFolder property of the item should be used instead.
    isFolder (item) {
      return !!item[this.childrenFieldName] && item.isFolder
    },
    arrayHasItem (array, item) {
      const matches = array.filter(c => c.id === item.id)

      return matches.length >= 1
    },
    /**
    * @param {Item} item
    * @returns {Array} parent items up to the root, including the item itself
                      [item, ...parents]
    */
    itemPathToRoot (item) {
      if (item.parentId === 'root') {
        return [item]
      }

      let pathElements = null
      const parent = this.findTreeItem(item.parentId)
      pathElements = this.itemPathToRoot(parent)
      pathElements.push(item)

      return pathElements
    },
    isChildOf (item, parent) {
      const pathToRoot = this.itemPathToRoot(item)
      return pathToRoot.some(e => e.id === parent.id)
    },
    appendData (newData) {
      this.initializeData(newData)
      this.data.push(...newData)
    },
    /**
      Adds a new item after the last root item.
      e, oriNode, oriItem, reorder
    */
    appendAfterLastRootItemFromDropEvent (event) {
      const lastRootItem = this.data[this.data.length - 1]
      const lastRootItemComponent = this.getChildVueComponentForItem(lastRootItem)
      
      this.onItemDrop(
        event, 
        lastRootItemComponent,
        lastRootItem, 
        {
          after: true,
          before: false
        }
      )
    },
    getChildVueComponentForItem (item) {
      let foundComponent = null
      crawl(
        this,
        (node, context) => {
          if (node.data && node.data.id === item.id) {
            foundComponent = node
            context.break()
          }
        },
        { getChildren: node => node.$children }
      )

      return foundComponent
    }
  }
};
</script>
<style lang="less">
@import "./less/style";
</style>
