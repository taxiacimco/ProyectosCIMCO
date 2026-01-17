' Ruta al script de PowerShell que queremos ejecutar
powershellPath = "C:\Users\Carlos Fuentes\ProyectosCIMCO\scripts\auto-run.ps1"

' Objeto para ejecutar comandos
Set objShell = CreateObject("WScript.Shell")

' Comando para ejecutar PowerShell. El argumento -WindowStyle Hidden oculta la ventana.
' -NoProfile: No carga el perfil para un inicio rápido.
' -File: Especifica el script a ejecutar.
command = "powershell.exe -NoProfile -WindowStyle Hidden -File """ & powershellPath & """"

' Ejecuta el comando de forma asíncrona (0) y no espera su finalización (False)
objShell.Run command, 0, False

' Limpia el objeto
Set objShell = Nothing