import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
	plugins: [react(), tailwindcss()],
	resolve: {
		alias: {
			'@': resolve(__dirname, 'src'),
		},
	},
	build: {
		chunkSizeWarningLimit: 1000,
		rollupOptions: {
			output: {
				manualChunks: {
					vendor: ['react', 'react-dom'],
					three: ['three', '@react-three/fiber', '@react-three/drei'],
				},
			},
		},
	},
	optimizeDeps: {
		include: ['react', 'react-dom', 'three', '@react-three/fiber', '@react-three/drei'],
	},
	server: {
		fs: {
			strict: false,
		},
	},
})
