export default function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode
}>) {
	return (
		<html lang='en'>
			<body>
				<header className='p-4 bg-black'>
					<div className='text-2xl'>Appmania</div>
				</header>
				{children}
			</body>
		</html>
	)
}
