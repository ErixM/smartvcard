<template>
  <div id="downloadSection" class="mt-16">
    <h2 class="font-extrabold text-2xl">Download or Deploy</h2>
    <div class="stepC mt-6">
      <p>Please complete the checklist to proceed,</p>
      <Check
        v-for="(item, index) in downloadCheckList"
        :downloadCheckList="downloadCheckList"
        :item="item"
        :key="index"
        :index="index"
      />

      <!-- Deploy to Live URL Button -->
      <button
        @click="deployToServer"
        class="
          inline-block
          bg-gray-700
          leading-none
          text-2xl
          tracking-wide
          border-2 border-transparent
          font-extrabold
          p-6
          rounded
          mt-12
          mr-4
          select-none
          transition-colors
          duration-200
          focus:outline-none
        "
        :title="
          downloadChecked
            ? 'Deploy your card to a live URL'
            : 'Complete the checklist to deploy'
        "
        :class="
          downloadChecked
            ? 'bg-blue-600 cursor-pointer text-white focus:bg-blue-500 hover:bg-blue-500'
            : 'text-black nopointerEvent '
        "
        :disabled="!downloadChecked || deploying"
      >
        {{ deploying ? 'Deploying...' : '🚀 Deploy to Live URL' }}
      </button>

      <!-- Download ZIP Button -->
      <button
        ref="downloadPackage"
        @click="downloadPackage"
        class="
          inline-block
          bg-gray-700
          leading-none
          text-2xl
          tracking-wide
          border-2 border-transparent
          font-extrabold
          p-6
          rounded
          mt-12
          select-none
          transition-colors
          duration-200
          focus:outline-none
        "
        :title="
          downloadChecked
            ? ''
            : 'Complete the checklist to download the package'
        "
        :class="
          downloadChecked
            ? 'bg-green-600 cursor-pointer text-white focus:bg-green-500 hover:bg-green-500'
            : 'text-black nopointerEvent '
        "
      >
        Download as ZIP
      </button>

      <!-- Deployment Success Message -->
      <div v-if="deploymentUrl" class="mt-6 border p-4 rounded border-green-600 bg-green-900 text-green-100">
        <span class="font-extrabold text-2xl">🎉 Card Deployed Successfully!</span>
        <br /><br />
        Your card is now live at:
        <br />
        <a
          :href="deploymentUrl"
          target="_blank"
          class="
            cursor-pointer
            underline
            font-extrabold
            text-green-300
            hover:text-green-400
            focus:text-green-400
            transition-colors
            duration-200
            text-xl
          "
        >{{ deploymentUrl }}</a>
        <br /><br />
        <button
          @click="copyDeploymentUrl"
          class="bg-green-700 hover:bg-green-600 px-4 py-2 rounded text-sm font-bold"
        >
          {{ urlCopied ? '✓ Copied!' : 'Copy URL' }}
        </button>
      </div>
      <p class="mt-6 border p-4 rounded border-gray-700 text-gray-400">
        <span class="font-extrabold text-2xl" style="color:#FFFFFF;">After You Download...</span>
      <br/><br/><span><strong>DO IT YOURSELF</strong></span><br/>
        Extract the downloaded ZIP file and follow the
        <NuxtLink
          to="/hosting-guide"
          class="
            cursor-pointer
            underline
            font-extrabold
            text-green-500
            hover:text-green-600
            focus:text-green-600
            transition-colors
            duration-200
          "
          >Hosting&nbsp;Guide</NuxtLink
        >
        to get your digital business card online.
        <br /><br />
        <span><strong>DONE FOR YOU</strong></span><br/>
        Optionally host your vCard Zip folder on our
         <a
          href="https://www.ziphost.app/"
          class="
            cursor-pointer
            underline
            font-extrabold
            text-green-500
            hover:text-green-600
            focus:text-green-600
            transition-colors
            duration-200
          "
          target="_blank"
          >domain</a
        >
        (i.e vcard.fyi/yourname)
      </p>
    </div>
  </div>
</template>

<script>
import Check from '@/components/Check'
export default {
  props: ['downloadCheckList', 'downloadChecked', 'downloadPackage', 'deployCard'],
  components: {
    Check
  },
  data() {
    return {
      deploying: false,
      deploymentUrl: null,
      urlCopied: false
    }
  },
  methods: {
    async deployToServer() {
      if (!this.downloadChecked || this.deploying) return

      this.deploying = true
      this.deploymentUrl = null

      try {
        const result = await this.deployCard()
        if (result && result.url) {
          this.deploymentUrl = result.url
        }
      } catch (error) {
        console.error('Deployment failed:', error)
      } finally {
        this.deploying = false
      }
    },
    async copyDeploymentUrl() {
      if (!this.deploymentUrl) return

      try {
        await navigator.clipboard.writeText(this.deploymentUrl)
        this.urlCopied = true
        setTimeout(() => {
          this.urlCopied = false
        }, 2000)
      } catch (error) {
        console.error('Failed to copy URL:', error)
      }
    }
  }
}
</script>
<style>
.nopointerEvent {
  pointer-events: none;
  cursor: not-allowed;
}
</style>
