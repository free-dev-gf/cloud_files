export const state = () => ({
  username: '',
  files: [],
})

export const mutations = {
  updateData(state, data) {
    state.username = data.name;
    state.files = data.files;
  },
}