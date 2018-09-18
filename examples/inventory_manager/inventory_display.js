const { Input, WithData } = require("../../dist/ui/goldish-ui")
// const { Input, WithData } = require('goldish-ui')
const React = require('react')

const InventoryItem = WithData(
  ({ id, db, local, selectedItemId, quantity, shouldAlarmForLowStock }) => {
    const selectItem = () => local.selectedItemId().set(id)

    const style = {}

    if (parseInt(quantity) < 1 && shouldAlarmForLowStock) {
      style.background = 'lightcoral'
    }

    if (selectedItemId === id) {
      style.border = '2px solid lightgreen'
    }

    return (
      <div className="inventory-item" style={style}>
        <div className="iventory-item-field">
          <div className="iventory-item-field-label">Name:</div>
          <Input text={db.Item.name(id)} updateOnEnter />
        </div>

        <div className="iventory-item-field">
          <div className="iventory-item-field-label">Price:</div>
          <Input text={db.Item.price(id)} />
        </div>

        <div className="iventory-item-field">
          <div className="iventory-item-field-label">Quantity:</div>
          <Input text={db.Item.quantity(id)} />
        </div>
        <div>
          <button onClick={selectItem}>View</button>
        </div>
      </div>
    )
  }
)

const InventoryDisplayWithData = WithData(({ currentInventory, db, local }) => {
  return (
    <div className="inventory-item-list">
      {Object.keys(currentInventory || {}).map(itemId => (
        <InventoryItem
          selectedItemId={local.selectedItemId()}
          quantity={db.Item.quantity(itemId)}
          shouldAlarmForLowStock={local.shouldAlarmForLowStock()}
          db={db}
          local={local}
          key={itemId}
          id={itemId}
        />
      ))}
    </div>
  )
})

module.exports = ({ db, local }) => (
  <InventoryDisplayWithData
    db={db}
    local={local}
    currentInventory={db.currentInventory()}
  />
)
