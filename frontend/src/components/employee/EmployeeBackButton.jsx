import { ArrowLeft } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

/**
 * Soft-blue back control for employee portal screens.
 * Use fullWidth (default) for top-of-page navigation; set fullWidth={false} when sharing a row.
 */
function EmployeeBackButton({
  label = 'Home',
  to = '/employee/dashboard',
  onClick,
  fullWidth = true,
  className = '',
  disabled = false,
}) {
  const navigate = useNavigate()

  const handleClick = () => {
    if (onClick) {
      onClick()
      return
    }
    if (to) navigate(to)
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={disabled}
      className={[
        'emp-cta-btn emp-cta-btn-tonal',
        fullWidth ? 'emp-cta-btn-block' : 'flex-1',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <ArrowLeft size={16} />
      {label}
    </button>
  )
}

export default EmployeeBackButton
