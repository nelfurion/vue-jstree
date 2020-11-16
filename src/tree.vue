<template>
  <div :class="classes" role="tree" onselectstart="return false">
    <ul :class="containerClasses" role="group">
      <li class="tree-item js-tree-position-placeholder js-tree-position-before-children" :bookmark-id="data.id"></li>
      <template v-for="(child, index) in data">
        <tree-item
          class="tree-item tree-item-toplevel"
          :key="index"
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
            <slot :vm="_.vm" :model="_.model">
              <i :class="_.vm.themeIconClasses" role="presentation" v-if="!_.model.loading"></i>
              <span v-html="_.model[textFieldName]"></span>
            </slot>
          </template>
        </tree-item>
        <li class="tree-item js-tree-position-placeholder js-tree-position-after" :bookmark-id="child.id"></li>
      </template>
    </ul>
  </div>
</template>
<script lang="js">
import treeSearch from 'tree-search'
import TreeItem from "./tree-item.vue";

let ITEM_ID = 0;
let ITEM_HEIGHT_SMALL = 18;
let ITEM_HEIGHT_DEFAULT = 24;
let ITEM_HEIGHT_LARGE = 32;

export default {
  name: "VJstree",
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
    dragOverBackgroundColor: { type: String, default: "#C9FDC9" },
    onDragOverOpenFolderTimeout: { type: Number, default: 500 },
    klass: String
  },
  data() {
    return {
      draggedItem: undefined,
      draggedElm: undefined
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
    }
  },
  methods: {
    findTreeItem (id) {
      const find = treeSearch(this.childrenFieldName)
      return find(this.data, 'id', id)
    },
    initializeData(items, parent) {
      parent = parent || { id: 'root' }
      if (items && items.length > 0) {
        for (let i in items) {
          var dataItem = this.initializeDataItem(items[i], parent.id);
          items[i] = dataItem;
          this.initializeData(items[i][this.childrenFieldName], items[i]);
        }
      }
    },
    initializeDataItem(item, parentId) {
      function Model(
        item,
        textFieldName,
        valueFieldName,
        childrenFieldName,
        collapse
      ) {
        this.id = item.id || ITEM_ID++;
        this[textFieldName] = item[textFieldName] || "";
        this[valueFieldName] = item[valueFieldName] || item[textFieldName];
        this.icon = item.icon || "";
        this.opened = item.opened || collapse;
        this.selected = item.selected || false;
        this.disabled = item.disabled || false;
        this.loading = item.loading || false;
        this.isFolder = item.type === 'folder';
        this[childrenFieldName] = item[childrenFieldName] || [];
      }

      let node = Object.assign(
        new Model(
          item,
          this.textFieldName,
          this.valueFieldName,
          this.childrenFieldName,
          this.collapse
        ),
        item
      );

      node.parentId = parentId /* || item.id */ || 'root';

      let self = this;
      node.addBefore = function(data, selectedNode) {
        let newItem = self.initializeDataItem(data, node.parentId)
        let index = selectedNode.parentItem.findIndex(t => t.id === node.id)
        selectedNode.parentItem.splice(index, 0, newItem)
        self.$emit('update:add-before', node.id, newItem)
      };
      node.addAfter = function(data, selectedNode) {
        let newItem = self.initializeDataItem(data, node.parentId)
        let index = selectedNode.parentItem.findIndex(t => t.id === node.id) + 1
        selectedNode.parentItem.splice(index, 0, newItem)
        self.$emit('update:add-after', node.id, newItem)
      };
      node.addChild = function(data) {
        node[self.childrenFieldName] = node[self.childrenFieldName] || []
        let newItem = self.initializeDataItem(data, node.id);
        node.opened = true;
        node[self.childrenFieldName].unshift(newItem);
        self.$emit('update:add-child', node.id, newItem)
      };
      node.openChildren = function() {
        node.opened = true;
        self.handleRecursionNodeChildren(node, node => {
          node.opened = true;
        });
      };
      node.closeChildren = function() {
        node.opened = false;
        self.handleRecursionNodeChildren(node, node => {
          node.opened = false;
        });
      };
      node.removeSelf = function() {

      };
      return node;
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
    handleRecursionNodeChildren(node, func) {
      if (func(node) !== false) {
        if (
          node[this.childrenFieldName] &&
          node[this.childrenFieldName].length > 0
        ) {
          for (let childNode of node[this.childrenFieldName]) {
            this.handleRecursionNodeChildren(childNode, func);
          }
        }
      }
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
            this.draggedItem.item === oriItem ||
            (oriItem[this.childrenFieldName] &&
              oriItem[this.childrenFieldName].findIndex(
                t => t.id === this.draggedItem.item.id
              ) !== -1)
          )
        ) {
          return
        }

        // oriItem is the drop target node's data - addBefore/After are defined here
        // oriNode is the drop target node - node.parentItem is defined here
        // Since dragover reordering works by adding paddings over / under nodes,
        // the target is the node that we want to pass to addBefore/addAfter.
        // The addBefore and addAfter functions seem to be static functions, and
        // there doesn't appear to be any need for them to be called on a specific
        // node.
        this.addDraggedItem(this.draggedItem, oriItem, oriNode, reorder)
        this.$emit("item-drop", oriNode, oriItem, this.draggedItem.item, e)
      }
    },
    /**
      itemDescription = {
        item: {},
        index: Number
      }
    */
    addDraggedItem (draggedItemDescription, dropTargetData, dropTargetNode, reorder) {
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
        if (!this.isItemFolder(dropTargetData)) {
          return
        }
        
        dropTargetData.opened = true
      }

      this.$nextTick(() => {
        // If the dragged item has a parent item and that parent item
        // has the draggedItem - e.g. this will always be true for items
        // dragged in their own tree, but may not be true for items dragged
        // to different trees.
        this.removeItemFromParentArray(
          draggedItemDescription.parentItem, 
          draggedItemDescription
        )
        if (action === 'addChild') { 
          dropTargetData.addChild(draggedItemDescription.item)
        } else if (action === 'addBefore') {
          dropTargetData.addBefore(draggedItemDescription.item, dropTargetNode)
        } else if (action === 'addAfter') {
          dropTargetData.addAfter(draggedItemDescription.item, dropTargetNode)
        }
      })
    },
    /**
      itemDescription = {
        item: {},
        index: Number
      }
    */
    removeItemFromParentArray (parentArray, itemDescription) {
      if (parentArray) {
        if (this.arrayHasItem(parentArray, itemDescription.item)) {
          parentArray.splice(itemDescription.index, 1)
        }
      }
    },
    isItemFolder (item) {
      return !!item[this.childrenFieldName] && item.isFolder
    },
    arrayHasItem (array, item) {
      const matches = array.filter(c => c.id === item.id)

      return matches.length >= 1
    },
    appendData (newData) {
      this.initializeData(newData)
      this.data.push(...newData)
    },
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
  watch: {
    data: function (val) {
      this.initializeData(val)
    }
  },
  components: {
    TreeItem
  }
};
</script>
<style lang="less">
@import "./less/style";
</style>
