<template>
    <router-view />
</template>

<script setup lang="ts">
import { useDark, useToggle } from "@vueuse/core"

const isDark = useDark()
useDark(isDark)
</script>
