import { createSlice } from '@reduxjs/toolkit'
import { orders as seedOrders } from '../../data/mockData'

const initialState = {
  orders: seedOrders,
  activeOrderId: null, // the order currently being delivered (tracking screen)
  completedOrderId: null, // the just-completed order (complete screen)
}

const orderSlice = createSlice({
  name: 'order',
  initialState,
  reducers: {
    acceptOrder: (state, action) => {
      const id = action.payload
      const order = state.orders.find((o) => o.id === id)
      if (order) {
        order.status = 'Picked Up'
        order.statusStyle = 'active'
        order.accepted = true
      }
      state.activeOrderId = id
    },
    rejectOrder: (state, action) => {
      const id = action.payload
      const order = state.orders.find((o) => o.id === id)
      if (order) {
        order.status = 'Rejected'
        order.statusStyle = 'rejected'
        order.rejected = true
      }
    },
    completeActiveOrder: (state) => {
      if (state.activeOrderId) {
        const order = state.orders.find((o) => o.id === state.activeOrderId)
        if (order) {
          order.status = 'Delivered'
          order.statusStyle = 'delivered'
          order.completed = true
        }
        state.completedOrderId = state.activeOrderId
        state.activeOrderId = null
      }
    },
    clearCompleted: (state) => {
      state.completedOrderId = null
    },
  },
})

export const {
  acceptOrder,
  rejectOrder,
  completeActiveOrder,
  clearCompleted,
} = orderSlice.actions

// Selectors
export const selectActiveOrder = (state) =>
  state.order.orders.find((o) => o.id === state.order.activeOrderId) || null

export const selectCompletedOrder = (state) =>
  state.order.orders.find((o) => o.id === state.order.completedOrderId) || null

export default orderSlice.reducer
