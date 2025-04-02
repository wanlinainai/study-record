import { reactive, onMounted, onBeforeUnmount } from "vue";

export function usePoint() {
  let point = reactive({
    x: 0,
    y: 0
  })

  onMounted(() => {
    document.onclick = function (event) {
      point.x = event.pageX
      point.y = event.pageY
    }
  })

  onBeforeUnmount(() => {
    document.onclick = null;
  })

  return point
}