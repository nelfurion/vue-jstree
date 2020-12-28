let ITEM_ID = 0;

export const Item = {
  initializeData(items, parent, childrenFieldName) {
    parent = parent || { id: 'root' }
    if (items && items.length > 0) {
      for (let i in items) {
        var dataItem = this.initializeDataItem(items[i], parent.id);
        items[i] = dataItem;
        this.initializeData(items[i][childrenFieldName], items[i]);
      }
    }
  },
  initializeDataItem(
    item, 
    parentId, 
    textFieldName,
    valueFieldName,
    childrenFieldName,
    collapse
  ) {
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
        textFieldName,
        valueFieldName,
        childrenFieldName,
        collapse
      ),
      item
    );

    node.parentId = parentId /* || item.id */ || 'root';

    let self = this;
    node.addBefore = function (data, selectedNode) {
      let newItem = self.initializeDataItem(data, node.parentId)
      let index = selectedNode.parentItem.findIndex(t => t.id === node.id)
      selectedNode.parentItem.splice(index, 0, newItem)
      return newItem
    };
    node.addAfter = function (data, selectedNode) {
      let newItem = self.initializeDataItem(data, node.parentId)
      let index = selectedNode.parentItem.findIndex(t => t.id === node.id) + 1
      selectedNode.parentItem.splice(index, 0, newItem)
      return newItem
    };
    node.addChild = function (data) {
      node[childrenFieldName] = node[childrenFieldName] || []
      let newItem = self.initializeDataItem(data, node.id);
      node.opened = true;
      node[childrenFieldName].unshift(newItem);
      return newItem
    };
    node.openChildren = function () {
      node.opened = true;
      self.handleRecursionNodeChildren(
        node,
        childrenFieldName,
        node => {
          node.opened = true;
        }
      );
    };
    node.closeChildren = function () {
      node.opened = false;
      self.handleRecursionNodeChildren(
        node, 
        childrenFieldName,
        node => {
          node.opened = false;
        }
      );
    };
    node.removeSelf = function () {

    };
    return node;
  },
  handleRecursionNodeChildren(node, childrenFieldName, func) {
    if (func(node) !== false) {
      if (
        node[childrenFieldName] &&
        node[childrenFieldName].length > 0
      ) {
        for (let childNode of node[childrenFieldName]) {
          this.handleRecursionNodeChildren(childNode, childrenFieldName, func);
        }
      }
    }
  },
}